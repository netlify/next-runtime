//  @ts-check
const { existsSync, readJson, move, cpSync, copy, writeJson } = require('fs-extra')
const pLimit = require('p-limit')
const { join } = require('pathe')

const TEST_ROUTE = /\/\[[^/]+?](?=\/|$)/

const isDynamicRoute = (route) => TEST_ROUTE.test(route)

exports.moveStaticPages = async ({ netlifyConfig, target, i18n, failBuild }) => {
  const root = join(netlifyConfig.build.publish, target === 'server' ? 'server' : 'serverless')
  const pagesManifestPath = join(root, 'pages-manifest.json')
  if (!existsSync(pagesManifestPath)) {
    failBuild(`Could not find pages manifest at ${pagesManifestPath}`)
  }
  const files = []

  const moveFile = async (file) => {
    const source = join(root, file)
    // Trim the initial "pages"
    const filePath = file.slice(6)
    files.push(filePath)
    const dest = join(netlifyConfig.build.publish, filePath)
    await move(source, dest)
  }

  const pagesManifest = await readJson(pagesManifestPath)
  // Arbitrary limit of 10 concurrent file moves
  const limit = pLimit(10)
  const promises = Object.entries(pagesManifest).map(async ([route, filePath]) => {
    if (
      isDynamicRoute(route) ||
      !(filePath.endsWith('.html') || filePath.endsWith('.json')) ||
      filePath.endsWith('/404.html') ||
      filePath.endsWith('/500.html')
    ) {
      return
    }
    return limit(moveFile, filePath)
  })
  await Promise.all(promises)
  console.log(`Moved ${files.length} page files`)

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
