/* eslint-disable max-lines */
const { cpus } = require('os')

const { yellowBright } = require('chalk')
const { existsSync, readJson, move, cpSync, copy, writeJson, readFile, writeFile } = require('fs-extra')
const globby = require('globby')
const { outdent } = require('outdent')
const pLimit = require('p-limit')
const { join } = require('pathe')
const slash = require('slash')

const TEST_ROUTE = /(|\/)\[[^/]+?](\/|\.html|$)/

const isDynamicRoute = (route) => TEST_ROUTE.test(route)

const stripLocale = (rawPath, locales = []) => {
  const [locale, ...segments] = rawPath.split('/')
  if (locales.includes(locale)) {
    return segments.join('/')
  }
  return rawPath
}

const matchMiddleware = (middleware, filePath) =>
  middleware?.includes('') ||
  middleware?.find(
    (middlewarePath) =>
      filePath === middlewarePath || filePath === `${middlewarePath}.html` || filePath.startsWith(`${middlewarePath}/`),
  )

const matchesRedirect = (file, redirects) => {
  if (!Array.isArray(redirects)) {
    return false
  }
  return redirects.some((redirect) => {
    if (!redirect.regex || redirect.internal) {
      return false
    }
    // Strips the extension from the file path
    return new RegExp(redirect.regex).test(`/${file.slice(0, -5)}`)
  })
}

const matchesRewrite = (file, rewrites) => {
  if (Array.isArray(rewrites)) {
    return matchesRedirect(file, rewrites)
  }
  if (!Array.isArray(rewrites?.beforeFiles)) {
    return false
  }
  return matchesRedirect(file, rewrites.beforeFiles)
}

exports.matchesRedirect = matchesRedirect
exports.matchesRewrite = matchesRewrite
exports.matchMiddleware = matchMiddleware
exports.stripLocale = stripLocale
exports.isDynamicRoute = isDynamicRoute

// eslint-disable-next-line max-lines-per-function
exports.moveStaticPages = async ({ netlifyConfig, target, i18n }) => {
  console.log('Moving static page files to serve from CDN...')
  const outputDir = join(netlifyConfig.build.publish, target === 'server' ? 'server' : 'serverless')
  const root = join(outputDir, 'pages')

  // Load the middleware manifest so we can check if a file matches it before moving
  let middleware
  const manifestPath = join(outputDir, 'middleware-manifest.json')
  if (existsSync(manifestPath)) {
    const manifest = await readJson(manifestPath)
    if (manifest?.middleware) {
      middleware = Object.keys(manifest.middleware).map((path) => path.slice(1))
    }
  }

  const prerenderManifest = await readJson(join(netlifyConfig.build.publish, 'prerender-manifest.json'))
  const { redirects, rewrites } = await readJson(join(netlifyConfig.build.publish, 'routes-manifest.json'))

  const isrFiles = new Set()

  Object.entries(prerenderManifest.routes).forEach(([route, { initialRevalidateSeconds }]) => {
    if (initialRevalidateSeconds) {
      // Find all files used by ISR routes
      const trimmedPath = route.slice(1)
      isrFiles.add(`${trimmedPath}.html`)
      isrFiles.add(`${trimmedPath}.json`)
    }
  })

  const files = []
  const moveFile = async (file) => {
    const source = join(root, file)
    files.push(file)
    const dest = join(netlifyConfig.build.publish, file)
    try {
      await move(source, dest)
    } catch (error) {
      console.warn('Error moving file', source, error)
    }
  }
  // Move all static files, except error documents and nft manifests
  const pages = await globby(['**/*.{html,json}', '!**/(500|404|*.js.nft).{html,json}'], {
    cwd: root,
    dot: true,
  })

  const matchingMiddleware = new Set()
  const matchedPages = new Set()
  const matchedRedirects = new Set()
  const matchedRewrites = new Set()

  // Limit concurrent file moves to number of cpus or 2 if there is only 1
  const limit = pLimit(Math.max(2, cpus().length))
  const promises = pages.map(async (rawPath) => {
    const filePath = slash(rawPath)
    // Don't move ISR files, as they're used for the first request
    if (isrFiles.has(filePath)) {
      return
    }
    if (isDynamicRoute(filePath)) {
      return
    }
    if (matchesRedirect(filePath, redirects)) {
      matchedRedirects.add(filePath)
      return
    }
    if (matchesRewrite(filePath, rewrites)) {
      matchedRewrites.add(filePath)
      return
    }
    // Middleware matches against the unlocalised path
    const unlocalizedPath = stripLocale(rawPath, i18n?.locales)
    const middlewarePath = matchMiddleware(middleware, unlocalizedPath)
    // If a file matches middleware it can't be offloaded to the CDN, and needs to stay at the origin to be served by next/server
    if (middlewarePath) {
      matchingMiddleware.add(middlewarePath)
      matchedPages.add(rawPath)
      return
    }
    return limit(moveFile, filePath)
  })
  await Promise.all(promises)
  console.log(`Moved ${files.length} files`)

  if (matchedPages.size !== 0) {
    console.log(
      yellowBright(outdent`
        Skipped moving ${matchedPages.size} ${
        matchedPages.size === 1 ? 'file because it matches' : 'files because they match'
      } middleware, so cannot be deployed to the CDN and will be served from the origin instead. 
        This is fine, but we're letting you know because it may not be what you expect.
      `),
    )

    console.log(
      outdent`
        The following middleware matched statically-rendered pages:

        ${yellowBright([...matchingMiddleware].map((mid) => `- /${mid}/_middleware`).join('\n'))}

        ────────────────────────────────────────────────────────────────
      `,
    )
    // There could potentially be thousands of matching pages, so we don't want to spam the console with this
    if (matchedPages.size < 50) {
      console.log(
        outdent`
          The following files matched middleware and were not moved to the CDN:

          ${yellowBright([...matchedPages].map((mid) => `- ${mid}`).join('\n'))}

          ────────────────────────────────────────────────────────────────
        `,
      )
    }
  }

  if (matchedRedirects.size !== 0 || matchedRewrites.size !== 0) {
    console.log(
      yellowBright(outdent`
        Skipped moving ${
          matchedRedirects.size + matchedRewrites.size
        } files because they match redirects or beforeFiles rewrites, so cannot be deployed to the CDN and will be served from the origin instead.
      `),
    )
    if (matchedRedirects.size < 50 && matchedRedirects.size !== 0) {
      console.log(
        outdent`
          The following files matched redirects and were not moved to the CDN:

          ${yellowBright([...matchedRedirects].map((mid) => `- ${mid}`).join('\n'))}

          ────────────────────────────────────────────────────────────────
        `,
      )
    }
    if (matchedRewrites.size < 50 && matchedRewrites.size !== 0) {
      console.log(
        outdent`
          The following files matched beforeFiles rewrites and were not moved to the CDN:

          ${yellowBright([...matchedRewrites].map((mid) => `- ${mid}`).join('\n'))}

          ────────────────────────────────────────────────────────────────
        `,
      )
    }
  }

  // Write the manifest for use in the serverless functions
  await writeJson(join(netlifyConfig.build.publish, 'static-manifest.json'), files)

  if (i18n?.defaultLocale) {
    // Copy the default locale into the root
    const defaultLocaleDir = join(netlifyConfig.build.publish, i18n.defaultLocale)
    if (existsSync(defaultLocaleDir)) {
      await copy(defaultLocaleDir, `${netlifyConfig.build.publish}/`)
    }
  }
}

const patchFile = async ({ file, from, to }) => {
  if (!existsSync(file)) {
    return
  }
  const content = await readFile(file, 'utf8')
  if (content.includes(to)) {
    return
  }
  const newContent = content.replace(from, to)
  await writeFile(`${file}.orig`, content)
  await writeFile(file, newContent)
}

const getServerFile = (root) => {
  let serverFile
  try {
    serverFile = require.resolve('next/dist/server/next-server', { paths: [root] })
  } catch {
    // Ignore
  }
  if (!serverFile) {
    try {
      // eslint-disable-next-line node/no-missing-require
      serverFile = require.resolve('next/dist/next-server/server/next-server', { paths: [root] })
    } catch {
      // Ignore
    }
  }
  return serverFile
}

exports.patchNextFiles = async (root) => {
  const serverFile = getServerFile(root)
  console.log(`Patching ${serverFile}`)
  if (serverFile) {
    await patchFile({
      file: serverFile,
      from: `let ssgCacheKey = `,
      to: `let ssgCacheKey = process.env._BYPASS_SSG || `,
    })
  }
}

exports.unpatchNextFiles = async (root) => {
  const serverFile = getServerFile(root)
  const origFile = `${serverFile}.orig`
  if (existsSync(origFile)) {
    await move(origFile, serverFile, { overwrite: true })
  }
}

exports.movePublicFiles = async ({ appDir, publish }) => {
  const publicDir = join(appDir, 'public')
  if (existsSync(publicDir)) {
    await copy(publicDir, `${publish}/`)
  }
}
/* eslint-enable max-lines */
