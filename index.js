const fs = require('fs')
const path = require('path')
const util = require('util')
const makeDir = require('make-dir')
const findUp = require('find-up')

const validateNextUsage = require('./helpers/validateNextUsage')
const doesNotNeedPlugin = require('./helpers/doesNotNeedPlugin')

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

    if (await doesNotNeedPlugin({ netlifyConfig, packageJson, utils })) {
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
    if (await doesNotNeedPlugin({ netlifyConfig, packageJson, utils })) {
      return
    }

    console.log(`** Running Next on Netlify package **`)

    await makeDir(PUBLISH_DIR)

    // We cannot load `next-on-netlify` (which depends on `next`) at the
    // top-level because we validate whether the site is using `next`
    // inside `onPreBuild`.
    const nextOnNetlify = require('next-on-netlify')
    nextOnNetlify({ functionsDir: FUNCTIONS_SRC, publishDir: PUBLISH_DIR })
  },
}

const DEFAULT_FUNCTIONS_SRC = 'netlify/functions'
