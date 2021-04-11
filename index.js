const fs = require('fs')
const util = require('util')

const findUp = require('find-up')
const makeDir = require('make-dir')

const { restoreCache, saveCache } = require('./helpers/cacheBuild')
const copyUnstableIncludedDirs = require('./helpers/copyUnstableIncludedDirs')
const doesNotNeedPlugin = require('./helpers/doesNotNeedPlugin')
const getNextConfig = require('./helpers/getNextConfig')
const validateNextUsage = require('./helpers/validateNextUsage')
const nextOnNetlify = require('./src/index.js')

const pWriteFile = util.promisify(fs.writeFile)

// * Helpful Plugin Context *
// - Between the prebuild and build steps, the project's build command is run
// - Between the build and postbuild steps, any functions are bundled

module.exports = {
  async onPreBuild({ netlifyConfig, packageJson, utils }) {
    const { failBuild } = utils.build

    validateNextUsage(failBuild)

    const hasNoPackageJson = Object.keys(packageJson).length === 0
    if (hasNoPackageJson) {
      return failBuild('Could not find a package.json for this project')
    }

    const nextConfig = await getNextConfig(utils.failBuild)
    await restoreCache({ cache: utils.cache, distDir: nextConfig.distDir })

    if (await doesNotNeedPlugin({ netlifyConfig, packageJson, failBuild })) {
      return
    }

    const nextConfigPath = await findUp('next.config.js')
    if (nextConfigPath === undefined) {
      // Create the next config file with target set to serverless by default
      const nextConfig = `
          module.exports = {
            target: 'serverless'
          }
        `
      await pWriteFile('next.config.js', nextConfig)
    }
  },
  async onBuild({
    netlifyConfig,
    packageJson,
    constants: { PUBLISH_DIR, FUNCTIONS_SRC = DEFAULT_FUNCTIONS_SRC },
    utils,
  }) {
    const { failBuild } = utils.build

    if (await doesNotNeedPlugin({ netlifyConfig, packageJson, failBuild })) {
      return
    }

    console.log(`** Running Next on Netlify package **`)

    await makeDir(PUBLISH_DIR)

    await nextOnNetlify({ functionsDir: FUNCTIONS_SRC, publishDir: PUBLISH_DIR })
  },

  async onPostBuild({ netlifyConfig, packageJson, constants: { FUNCTIONS_DIST }, utils }) {
    if (await doesNotNeedPlugin({ netlifyConfig, packageJson, utils })) {
      return
    }

    const nextConfig = await getNextConfig(utils.failBuild)
    await saveCache({ cache: utils.cache, distDir: nextConfig.distDir })
    copyUnstableIncludedDirs({ nextConfig, functionsDist: FUNCTIONS_DIST })
  },
}

const DEFAULT_FUNCTIONS_SRC = 'netlify/functions'
