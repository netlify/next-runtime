const path = require('path')

const makeDir = require('make-dir')

const { restoreCache, saveCache } = require('./helpers/cacheBuild')
const checkNxConfig = require('./helpers/checkNxConfig')
const copyUnstableIncludedDirs = require('./helpers/copyUnstableIncludedDirs')
const doesNotNeedPlugin = require('./helpers/doesNotNeedPlugin')
const getNextConfig = require('./helpers/getNextConfig')
const getNextRoot = require('./helpers/getNextRoot')
const validateNextUsage = require('./helpers/validateNextUsage')
const verifyBuildTarget = require('./helpers/verifyBuildTarget')
const nextOnNetlify = require('./src')
// * Helpful Plugin Context *
// - Between the prebuild and build steps, the project's build command is run
// - Between the build and postbuild steps, any functions are bundled

module.exports = {
  async onPreBuild({ netlifyConfig, packageJson, utils, constants }) {
    const { failBuild } = utils.build

    validateNextUsage(failBuild)

    const hasNoPackageJson = Object.keys(packageJson).length === 0
    if (hasNoPackageJson) {
      return failBuild('Could not find a package.json for this project')
    }

    if (doesNotNeedPlugin({ netlifyConfig, packageJson, failBuild })) {
      return
    }

    // Populates the correct config if needed
    await verifyBuildTarget({ netlifyConfig, packageJson, failBuild })
    const nextRoot = getNextRoot({ netlifyConfig })

    // Because we memoize nextConfig, we need to do this after the write file
    const nextConfig = await getNextConfig(utils.failBuild, nextRoot)

    const isNx = Boolean(
      (packageJson.devDependencies && packageJson.devDependencies['@nrwl/next']) ||
        (packageJson.dependencies && packageJson.dependencies['@nrwl/next']),
    )

    if (isNx) {
      checkNxConfig({ netlifyConfig, packageJson, nextConfig, failBuild, constants })
    }

    if (nextConfig.images.domains.length !== 0 && !process.env.NEXT_IMAGE_ALLOWED_DOMAINS) {
      console.log(
        `Image domains set in next.config.js are ignored.\nPlease set the env variable NEXT_IMAGE_ALLOWED_DOMAINS to "${nextConfig.images.domains.join(
          ',',
        )}" instead`,
      )
    }
    await restoreCache({ cache: utils.cache, distDir: nextConfig.distDir })
  },
  async onBuild({
    netlifyConfig,
    packageJson,
    constants: { PUBLISH_DIR, FUNCTIONS_SRC = DEFAULT_FUNCTIONS_SRC },
    utils,
  }) {
    const { failBuild } = utils.build

    const nextRoot = getNextRoot({ netlifyConfig })

    if (doesNotNeedPlugin({ netlifyConfig, packageJson, failBuild })) {
      return
    }

    console.log(`** Running Next on Netlify package **`)

    await makeDir(PUBLISH_DIR)

    await nextOnNetlify({
      functionsDir: path.resolve(FUNCTIONS_SRC),
      publishDir: netlifyConfig.build.publish,
      nextRoot,
    })
  },

  async onPostBuild({ netlifyConfig, packageJson, constants: { FUNCTIONS_DIST = DEFAULT_FUNCTIONS_DIST }, utils }) {
    if (doesNotNeedPlugin({ netlifyConfig, packageJson, utils })) {
      return
    }
    const nextRoot = getNextRoot({ netlifyConfig })

    const nextConfig = await getNextConfig(utils.failBuild, nextRoot)
    await saveCache({ cache: utils.cache, distDir: nextConfig.distDir })
    copyUnstableIncludedDirs({ nextConfig, functionsDist: path.resolve(FUNCTIONS_DIST) })
  },
}

const DEFAULT_FUNCTIONS_SRC = 'netlify/functions'
const DEFAULT_FUNCTIONS_DIST = '.netlify/functions/'
