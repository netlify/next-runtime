const fs = require('fs')
const path = require('path')
const util = require('util')

const nextOnNetlify = require('next-on-netlify')
const { PHASE_PRODUCTION_BUILD } = require('next/constants')
const { default: loadConfig } = require('next/dist/next-server/server/config')
const findUp = require('find-up')
const makeDir = require('make-dir')
const { copy } = require('cpx')

const isStaticExportProject = require('./helpers/isStaticExportProject')

const pWriteFile = util.promisify(fs.writeFile)
const pCopy = util.promisify(copy)

// * Helpful Plugin Context *
// - Between the prebuild and build steps, the project's build command is run
// - Between the build and postbuild steps, any functions are bundled

module.exports = {
  async onPreBuild({ netlifyConfig, packageJson, utils, constants: { FUNCTIONS_SRC } }) {
    const { failBuild } = utils.build

    if (Object.keys(packageJson).length === 0) {
      return failBuild(`Could not find a package.json for this project`)
    }

    const { build } = netlifyConfig
    const { scripts = {}, dependencies = {} } = packageJson

    // TO-DO: Post alpha, try to remove this workaround for missing deps in
    // the next-on-netlify function template
    await utils.run.command('npm install next-on-netlify@latest')

    if (isStaticExportProject({ build, scripts })) {
      return failBuild(`** Static HTML export next.js projects do not require this plugin **`)
    }

    // TO-DO: check scripts to make sure the app isn't manually running NoN
    // For now, we'll make it clear in the README
    // const isAlreadyUsingNextOnNetlify = Object.keys(dependencies).find((dep) => dep === 'next-on-netlify');
    // if (isAlreadyUsingNextOnNetlify) {
    //   return failBuild(`This plugin cannot support apps that manually use next-on-netlify. Uninstall next-on-netlify as a dependency to resolve.`);
    // }

    const isFunctionsDirectoryCorrect =
      FUNCTIONS_SRC !== undefined && path.resolve(FUNCTIONS_SRC) === path.resolve('out_functions')
    if (!isFunctionsDirectoryCorrect) {
      // to do rephrase
      return failBuild(
        `You must designate a functions directory named "out_functions" in your netlify.toml or in your app's build settings on Netlify. See docs for more info: https://docs.netlify.com/functions/configure-and-deploy/#configure-the-functions-folder`,
      )
    }

    const nextConfigPath = await findUp('next.config.js')
    if (nextConfigPath !== undefined) {
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
    nextOnNetlify()

    // Next-on-netlify puts its files into out_functions and out_publish
    // Copy files from next-on-netlify's output to the right functions/publish dirs
    await makeDir(PUBLISH_DIR)
    await Promise.all([pCopy('out_functions/**', FUNCTIONS_SRC), pCopy('out_publish/**', PUBLISH_DIR)])
  },
}

const DEFAULT_FUNCTIONS_SRC = 'netlify-automatic-functions'
