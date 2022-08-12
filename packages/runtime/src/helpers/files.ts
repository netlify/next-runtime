/* eslint-disable max-lines */
import { cpus } from 'os'

import type { NetlifyConfig } from '@netlify/build'
import { yellowBright } from 'chalk'
import { existsSync, readJson, move, copy, writeJson, readFile, writeFile, ensureDir, readFileSync } from 'fs-extra'
import globby from 'globby'
import { PrerenderManifest } from 'next/dist/build'
import { outdent } from 'outdent'
import pLimit from 'p-limit'
import { join } from 'pathe'
import slash from 'slash'

import { MINIMUM_REVALIDATE_SECONDS, DIVIDER } from '../constants'

import { NextConfig } from './config'
import { Rewrites, RoutesManifest } from './types'
import { findModuleFromBase } from './utils'

const TEST_ROUTE = /(|\/)\[[^/]+?](\/|\.html|$)/

export const isDynamicRoute = (route) => TEST_ROUTE.test(route)

export const stripLocale = (rawPath: string, locales: Array<string> = []) => {
  const [locale, ...segments] = rawPath.split('/')
  if (locales.includes(locale)) {
    return segments.join('/')
  }
  return rawPath
}

export const matchMiddleware = (middleware: Array<string>, filePath: string): string | boolean =>
  middleware?.includes('') ||
  middleware?.find(
    (middlewarePath) =>
      filePath === middlewarePath || filePath === `${middlewarePath}.html` || filePath.startsWith(`${middlewarePath}/`),
  )

export const matchesRedirect = (file: string, redirects: Rewrites): boolean => {
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

export const matchesRewrite = (file: string, rewrites: Rewrites): boolean => {
  if (Array.isArray(rewrites)) {
    return matchesRedirect(file, rewrites)
  }
  if (!Array.isArray(rewrites?.beforeFiles)) {
    return false
  }
  return matchesRedirect(file, rewrites.beforeFiles)
}

export const getMiddleware = async (publish: string): Promise<Array<string>> => {
  if (process.env.NEXT_USE_NETLIFY_EDGE) {
    return []
  }
  const manifestPath = join(publish, 'server', 'middleware-manifest.json')
  if (existsSync(manifestPath)) {
    const manifest = await readJson(manifestPath, { throws: false })
    return manifest?.sortedMiddleware ?? []
  }
  return []
}

// eslint-disable-next-line max-lines-per-function
export const moveStaticPages = async ({
  netlifyConfig,
  target,
  i18n,
  basePath,
}: {
  netlifyConfig: NetlifyConfig
  target: 'server' | 'serverless' | 'experimental-serverless-trace'
  i18n: NextConfig['i18n']
  basePath?: string
}): Promise<void> => {
  console.log('Moving static page files to serve from CDN...')
  const outputDir = join(netlifyConfig.build.publish, target === 'server' ? 'server' : 'serverless')
  const root = join(outputDir, 'pages')
  const buildId = readFileSync(join(netlifyConfig.build.publish, 'BUILD_ID'), 'utf8').trim()
  const dataDir = join('_next', 'data', buildId)
  await ensureDir(join(netlifyConfig.build.publish, dataDir))
  // Load the middleware manifest so we can check if a file matches it before moving
  const middlewarePaths = await getMiddleware(netlifyConfig.build.publish)
  const middleware = middlewarePaths.map((path) => path.slice(1))

  const prerenderManifest: PrerenderManifest = await readJson(
    join(netlifyConfig.build.publish, 'prerender-manifest.json'),
  )
  const { redirects, rewrites }: RoutesManifest = await readJson(
    join(netlifyConfig.build.publish, 'routes-manifest.json'),
  )

  const isrFiles = new Set<string>()

  const shortRevalidateRoutes: Array<{ Route: string; Revalidate: number }> = []

  Object.entries(prerenderManifest.routes).forEach(([route, { initialRevalidateSeconds }]) => {
    if (initialRevalidateSeconds) {
      // Find all files used by ISR routes
      const trimmedPath = route === '/' ? 'index' : route.slice(1)
      isrFiles.add(`${trimmedPath}.html`)
      isrFiles.add(`${trimmedPath}.json`)
      if (initialRevalidateSeconds < MINIMUM_REVALIDATE_SECONDS) {
        shortRevalidateRoutes.push({ Route: route, Revalidate: initialRevalidateSeconds })
      }
    }
  })

  const files: Array<string> = []
  const filesManifest: Record<string, string> = {}
  const moveFile = async (file) => {
    const isData = file.endsWith('.json')
    const source = join(root, file)
    const targetFile = isData ? join(dataDir, file) : file
    const targetPath = basePath ? join(basePath, targetFile) : targetFile

    files.push(file)
    filesManifest[file] = targetPath

    const dest = join(netlifyConfig.build.publish, targetPath)

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
  const promises = pages.map((rawPath) => {
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
        ${DIVIDER}
      `,
    )
    // There could potentially be thousands of matching pages, so we don't want to spam the console with this
    if (matchedPages.size < 50) {
      console.log(
        outdent`
          The following files matched middleware and were not moved to the CDN:

          ${yellowBright([...matchedPages].map((mid) => `- ${mid}`).join('\n'))}
          ${DIVIDER}
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
          ${DIVIDER}
        `,
      )
    }
    if (matchedRewrites.size < 50 && matchedRewrites.size !== 0) {
      console.log(
        outdent`
          The following files matched beforeFiles rewrites and were not moved to the CDN:

          ${yellowBright([...matchedRewrites].map((mid) => `- ${mid}`).join('\n'))}
          ${DIVIDER}
        `,
      )
    }
  }

  // Write the manifest for use in the serverless functions
  await writeJson(join(netlifyConfig.build.publish, 'static-manifest.json'), Object.entries(filesManifest))

  if (i18n?.defaultLocale) {
    const rootPath = basePath ? join(netlifyConfig.build.publish, basePath) : netlifyConfig.build.publish
    // Copy the default locale into the root
    const defaultLocaleDir = join(rootPath, i18n.defaultLocale)
    if (existsSync(defaultLocaleDir)) {
      await copy(defaultLocaleDir, `${rootPath}/`)
    }
    const defaultLocaleIndex = join(rootPath, `${i18n.defaultLocale}.html`)
    const indexHtml = join(rootPath, 'index.html')
    if (existsSync(defaultLocaleIndex) && !existsSync(indexHtml)) {
      await copy(defaultLocaleIndex, indexHtml, { overwrite: false }).catch(() => {
        /* ignore */
      })
      await copy(join(rootPath, `${i18n.defaultLocale}.json`), join(rootPath, 'index.json'), {
        overwrite: false,
      }).catch(() => {
        /* ignore */
      })
    }
  }

  if (shortRevalidateRoutes.length !== 0) {
    console.log(outdent`
      The following routes use "revalidate" values of under ${MINIMUM_REVALIDATE_SECONDS} seconds, which is not supported.
      They will use a revalidate time of ${MINIMUM_REVALIDATE_SECONDS} seconds instead.
    `)
    console.table(shortRevalidateRoutes)
    // TODO: add these docs
    // console.log(
    //   outdent`
    //     For more information, see https://ntl.fyi/next-revalidate-time
    //     ${DIVIDER}
    //   `,
    // )
  }
}

/**
 * Attempt to patch a source file, preserving a backup
 */
const patchFile = async ({
  file,
  replacements,
}: {
  file: string
  replacements: Array<[from: string, to: string]>
}): Promise<boolean> => {
  if (!existsSync(file)) {
    console.warn('File was not found')
    return false
  }
  const content = await readFile(file, 'utf8')
  const newContent = replacements.reduce((acc, [from, to]) => {
    if (acc.includes(to)) {
      console.log('Already patched. Skipping.')
      return acc
    }
    return acc.replace(from, to)
  }, content)
  if (newContent === content) {
    console.warn('File was not changed')
    return false
  }
  await writeFile(`${file}.orig`, content)
  await writeFile(file, newContent)
  console.log('Done')
  return true
}
/**
 * The file we need has moved around a bit over the past few versions,
 * so we iterate through the options until we find it
 */
const getServerFile = (root: string, includeBase = true) => {
  const candidates = ['next/dist/server/next-server', 'next/dist/next-server/server/next-server']

  if (includeBase) {
    candidates.unshift('next/dist/server/base-server')
  }

  return findModuleFromBase({ candidates, paths: [root] })
}

const baseServerReplacements: Array<[string, string]> = [
  [`let ssgCacheKey = `, `let ssgCacheKey = process.env._BYPASS_SSG || `],
]

const nextServerReplacements: Array<[string, string]> = [
  [
    `getMiddlewareManifest() {\n        if (this.minimalMode) return null;`,
    `getMiddlewareManifest() {\n        if (this.minimalMode || process.env.NEXT_USE_NETLIFY_EDGE) return null;`,
  ],
  [
    `generateCatchAllMiddlewareRoute(devReady) {\n        if (this.minimalMode) return []`,
    `generateCatchAllMiddlewareRoute(devReady) {\n        if (this.minimalMode || process.env.NEXT_USE_NETLIFY_EDGE) return [];`,
  ],
  [
    `generateCatchAllMiddlewareRoute() {\n        if (this.minimalMode) return undefined;`,
    `generateCatchAllMiddlewareRoute() {\n        if (this.minimalMode || process.env.NEXT_USE_NETLIFY_EDGE) return undefined;`,
  ],
  [
    `getMiddlewareManifest() {\n        if (this.minimalMode) {`,
    `getMiddlewareManifest() {\n        if (!this.minimalMode && !process.env.NEXT_USE_NETLIFY_EDGE) {`,
  ],
]

export const patchNextFiles = async (root: string): Promise<void> => {
  const baseServerFile = getServerFile(root)
  console.log(`Patching ${baseServerFile}`)
  if (baseServerFile) {
    await patchFile({
      file: baseServerFile,
      replacements: baseServerReplacements,
    })
  }

  const nextServerFile = getServerFile(root, false)
  console.log(`Patching ${nextServerFile}`)
  if (nextServerFile) {
    await patchFile({
      file: nextServerFile,
      replacements: nextServerReplacements,
    })
  }
}

export const unpatchFile = async (file: string): Promise<void> => {
  const origFile = `${file}.orig`
  if (existsSync(origFile)) {
    await move(origFile, file, { overwrite: true })
  }
}

export const unpatchNextFiles = async (root: string): Promise<void> => {
  const baseServerFile = getServerFile(root)
  await unpatchFile(baseServerFile)
  const nextServerFile = getServerFile(root, false)
  if (nextServerFile !== baseServerFile) {
    await unpatchFile(nextServerFile)
  }
}

export const movePublicFiles = async ({
  appDir,
  outdir,
  publish,
}: {
  appDir: string
  outdir?: string
  publish: string
}): Promise<void> => {
  // `outdir` is a config property added when using Next.js with Nx. It's typically
  // a relative path outside of the appDir, e.g. '../../dist/apps/<app-name>', and
  // the parent directory of the .next directory.
  // If it exists, copy the files from the public folder there in order to include
  // any files that were generated during the build. Otherwise, copy the public
  // directory from the original app directory.
  const publicDir = outdir ? join(appDir, outdir, 'public') : join(appDir, 'public')
  if (existsSync(publicDir)) {
    await copy(publicDir, `${publish}/`)
  }
}
/* eslint-enable max-lines */
