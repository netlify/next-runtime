//  @ts-check
const { cpus } = require('os')

const { existsSync, readJson, move, cpSync, copy, writeJson } = require('fs-extra')
const pLimit = require('p-limit')
const { join } = require('pathe')
const glob = require('tiny-glob')

const TEST_ROUTE = /(|\/)\[[^/]+?](\/|\.html|$)/

const isDynamicRoute = (route) => TEST_ROUTE.test(route)

exports.moveStaticPages = async ({ netlifyConfig, target, i18n, failBuild }) => {
  console.log('Moving static page files to serve from CDN...')
  const root = join(netlifyConfig.build.publish, target === 'server' ? 'server' : 'serverless', 'pages')

  const files = []

  const moveFile = async (file) => {
    const source = join(root, file)
    files.push(file)
    const dest = join(netlifyConfig.build.publish, file)
    await move(source, dest)
  }
  // Move all static files, except error documents and nft manifests
  const pages = await glob('**/!(500|404|*.nft).{html,json}', {
    cwd: root,
    dot: true,
  })

  // Limit concurrent file moves to number of cpus or 2 if there is only 1
  const limit = pLimit(Math.max(2, cpus().length))
  const promises = pages.map(async (filePath) => {
    if (isDynamicRoute(filePath)) {
      return
    }
    return limit(moveFile, filePath)
  })
  await Promise.all(promises)
  console.log(`Moved ${files.length} files`)

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

exports.movePublicFiles = async ({ appDir, publish }) => {
  const publicDir = join(appDir, 'public')
  if (existsSync(publicDir)) {
    await copy(publicDir, `${publish}/`)
  }
}
