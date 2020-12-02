const fs = require('fs')
const path = require('path')
const util = require('util')

const findUp = require('find-up')
const makeDir = require('make-dir')

const { name: pluginName } = require('./package.json')
const isStaticExportProject = require('./helpers/isStaticExportProject')
const validateNextUsage = require('./helpers/validateNextUsage')

const pWriteFile = util.promisify(fs.writeFile)

// * Helpful Plugin Context *
// - Between the prebuild and build steps, the project's build command is run
// - Between the build and postbuild steps, any functions are bundled

module.exports = {
  async onPreBuild({ netlifyConfig, packageJson, utils }) {
    const { failBuild } = utils.build

    validateNextUsage(failBuild)

    if (Object.keys(packageJson).length === 0) {
      return failBuild(`Could not find a package.json for this project`)
    }

    const { build } = netlifyConfig
    const { name, scripts = {}, dependencies = {} } = packageJson

    if (isStaticExportProject({ build, scripts })) {
      return failBuild(`** Static HTML export next.js projects do not require this plugin **`)
    }

    const hasNextOnNetlifyInstalled = dependencies['next-on-netlify'] !== undefined
    const hasNextOnNetlifyPostbuildScript =
      typeof scripts.postbuild === 'string' && scripts.postbuild.includes('next-on-netlify')
    const isAlreadyUsingNextOnNetlify =
      (hasNextOnNetlifyInstalled || hasNextOnNetlifyPostbuildScript) && pluginName !== name
    if (isAlreadyUsingNextOnNetlify) {
      return failBuild(
        `This plugin does not support sites that manually use next-on-netlify. Uninstall next-on-netlify as a dependency to resolve.`,
      )
    }

    const nextConfigPath = await findUp('next.config.js')
    if (nextConfigPath !== undefined) {
      // We cannot load `next` at the top-level because we validate whether the
      // site is using `next` inside `onPreBuild`.
      const { PHASE_PRODUCTION_BUILD } = require('next/constants')
      const { default: loadConfig } = require('next/dist/next-server/server/config')

      // If the next config exists, fail build if target isnt in acceptableTargets
      const acceptableTargets = ['serverless', 'experimental-serverless-trace']
      const nextConfig = loadConfig(PHASE_PRODUCTION_BUILD, path.resolve('.'))
      const isValidTarget = acceptableTargets.includes(nextConfig.target)
      if (!isValidTarget) {
        return failBuild(`next.config.js must be one of: ${acceptableTargets.join(', ')}`)
      }
    } else {
      // Create the next config file with target set to serverless by default
      const nextConfig = `
          module.exports = {
            target: 'serverless'
          }
        `
      await pWriteFile('next.config.js', nextConfig)
      console.log(`** Adding next.config.js with target set to 'serverless' **`)
    }
  },
  async onBuild({ constants: { PUBLISH_DIR, FUNCTIONS_SRC = DEFAULT_FUNCTIONS_SRC } }) {
    console.log(`** Running Next on Netlify package **`)

    await makeDir(PUBLISH_DIR)

    // We cannot load `next-on-netlify` (which depends on `next`) at the
    // top-level because we validate whether the site is using `next`
    // inside `onPreBuild`.
    const nextOnNetlify = require('next-on-netlify')
    nextOnNetlify({ functionsDir: FUNCTIONS_SRC, publishDir: PUBLISH_DIR })
  },
}

const DEFAULT_FUNCTIONS_SRC = 'netlify-automatic-functions'
