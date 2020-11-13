const path = require('path')
const nextOnNetlify = require('next-on-netlify')
const { PHASE_PRODUCTION_BUILD } = require('next/constants')
const { default: loadConfig } = require('next/dist/next-server/server/config')
const makef = require('makef')
const makeDir = require('make-dir')
const pathExists = require('path-exists')
const cpx = require('cpx')
const isStaticExportProject = require('./helpers/isStaticExportProject')

// * Helpful Plugin Context *
// - Between the prebuild and build steps, the project's build command is run
// - Between the build and postbuild steps, any functions are bundled

module.exports = {
  async onPreBuild({ netlifyConfig, packageJson, utils, constants: { FUNCTIONS_SRC } }) {
    const { failBuild } = utils.build

    if (!packageJson) {
      failBuild(`Could not find a package.json for this project`)
      return
    }

    if (!netlifyConfig) {
      failBuild(`Could not find a Netlify configuration for this project`)
      return
    }

    const { build } = netlifyConfig
    const { scripts = {}, dependencies = {} } = packageJson

    // TO-DO: Post alpha, try to remove this workaround for missing deps in
    // the next-on-netlify function template
    await utils.run.command('npm install next-on-netlify@latest')

    if (isStaticExportProject({ build, scripts })) {
      failBuild(`** Static HTML export next.js projects do not require this plugin **`)
    }

    // TO-DO: check scripts to make sure the app isn't manually running NoN
    // For now, we'll make it clear in the README
    // const isAlreadyUsingNextOnNetlify = Object.keys(dependencies).find((dep) => dep === 'next-on-netlify');
    // if (isAlreadyUsingNextOnNetlify) {
    //   failBuild(`This plugin cannot support apps that manually use next-on-netlify. Uninstall next-on-netlify as a dependency to resolve.`);
    // }

    const isFunctionsDirectoryCorrect =
      FUNCTIONS_SRC !== undefined && path.resolve(FUNCTIONS_SRC) === path.resolve('out_functions')
    if (!isFunctionsDirectoryCorrect) {
      // to do rephrase
      failBuild(
        `You must designate a functions directory named "out_functions" in your netlify.toml or in your app's build settings on Netlify. See docs for more info: https://docs.netlify.com/functions/configure-and-deploy/#configure-the-functions-folder`,
      )
    }

    const hasNextConfig = await pathExists('next.config.js')
    if (hasNextConfig) {
      // If the next config exists, fail build if target isnt in acceptableTargets
      const acceptableTargets = ['serverless', 'experimental-serverless-trace']
      const nextConfig = loadConfig(PHASE_PRODUCTION_BUILD, path.resolve('.'))
      const isValidTarget = acceptableTargets.includes(nextConfig.target)
      if (!isValidTarget) {
        failBuild(`next.config.js must be one of: ${acceptableTargets.join(', ')}`)
      }
    } else {
      // Create the next config file with target set to serverless by default
      const nextConfig = `
          module.exports = {
            target: 'serverless'
          }
        `
      makef.createFile({ 'next.config.js': nextConfig })
      console.log(`** Adding next.config.js with target set to 'serverless' **`)
    }
  },
  async onBuild({ constants }) {
    console.log(`** Running Next on Netlify package **`)
    nextOnNetlify()

    // Next-on-netlify puts its files into out_functions and out_publish
    // Copy files from next-on-netlify's output to the right functions/publish dirs

    // TO-DO: use FUNCTIONS_DIST when internal bug is fixed
    const { PUBLISH_DIR } = constants
    // if (!(await pathExists(FUNCTIONS_DIST))) {
    //   await makeDir(FUNCTIONS_DIST)
    // }
    const hasPublishDir = await pathExists(PUBLISH_DIR)
    if (!hasPublishDir) {
      await makeDir(PUBLISH_DIR)
    }

    // TO-DO: make sure FUNCTIONS_DIST doesnt have a custom function name conflict
    // with function names that next-on-netlify can generate
    // cpx.copySync('out_functions/**/*', FUNCTIONS_SRC);
    cpx.copySync('out_publish/**/*', PUBLISH_DIR)
  },
}
