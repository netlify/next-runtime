const fs = require('fs');
const { existsSync, readFileSync } = require('fs');
const path = require('path');
const { appendFile, readdir } = require('fs').promises;
const { hasFramework } = require('@netlify/framework-info');
const nextOnNetlify = require('next-on-netlify');
const { PHASE_PRODUCTION_BUILD } = require('next/constants');
const { default: loadConfig } = require('next/dist/next-server/server/config');
const makeDir = require('make-dir');
const cpx = require('cpx');
const isStaticExportProject = require('./helpers/isStaticExportProject');

// * Helpful Plugin Context *
// - Between the prebuild and build steps, the project's build command is run
// - Between the build and postbuild steps, any functions are bundled

module.exports = {
  async onPreBuild({ constants, netlifyConfig, utils }) {
    if (!(await hasFramework('next'))) {
      return failBuild(`This application does not use Next.js.`);
    }

    const { build } = netlifyConfig;
    const { failBuild } = utils.build;

      // TO-DO: Post alpha, try to remove this workaround for missing deps in
      // the next-on-netlify function template
      await utils.run.command('npm install next-on-netlify@latest');

      // Require the project's package.json for access to its scripts
      // and dependencies in order to check existing project configuration
      let packageJson;
      if (existsSync(path.resolve(constants.PUBLISH_DIR, 'package.json'))) {
        packageJson = require(path.resolve(constants.PUBLISH_DIR, 'package.json'));
      } else if (existsSync(path.resolve(constants.PUBLISH_DIR, '..', 'package.json'))) {
        packageJson = require(path.resolve(constants.PUBLISH_DIR, '..', 'package.json'));
      } else {
        failBuild(`Cannot locate your package.json file. Please make sure your package.json is
          at the root of your project or in your publish directory.`
        );
      }

      const { scripts, dependencies } = packageJson;

      if (isStaticExportProject({ build, scripts })) {
        failBuild(`** Static HTML export next.js projects do not require this plugin **`);
      }

      // TO-DO: check scripts to make sure the app isn't manually running NoN
      // For now, we'll make it clear in the README
      // const isAlreadyUsingNextOnNetlify = Object.keys(dependencies).find((dep) => dep === 'next-on-netlify');
      // if (isAlreadyUsingNextOnNetlify) {
      //   failBuild(`This plugin cannot support apps that manually use next-on-netlify. Uninstall next-on-netlify as a dependency to resolve.`);
      // }

      const isFunctionsDirectoryCorrect = build && build.functions && build.functions === path.resolve('out_functions');
      if (!isFunctionsDirectoryCorrect) {
        // to do rephrase
        failBuild(`You must designate a functions directory named "out_functions" in your netlify.toml or in your app's build settings on Netlify. See docs for more info: https://docs.netlify.com/functions/configure-and-deploy/#configure-the-functions-folder`);
      }

      if (existsSync('next.config.js')) {
        // If the next config exists, fail build if target isnt in acceptableTargets
        const acceptableTargets = ['serverless', 'experimental-serverless-trace'];
        const nextConfig = loadConfig(PHASE_PRODUCTION_BUILD, path.resolve('.'));
        const isValidTarget = acceptableTargets.includes(nextConfig.target);
        if (!isValidTarget) {
          failBuild(`next.config.js must be one of: ${acceptableTargets.join(', ')}`);
        }
      } else {
        // Create the next config file with target set to serverless by default
        const nextConfig = `
          module.exports = {
            target: 'serverless'
          }
        `;
        await appendFile('next.config.js', nextConfig);
        console.log(`** Adding next.config.js with target set to 'serverless' **`);
      }
  },
  async onBuild({ constants }) {
      console.log(`** Running Next on Netlify package **`);
      nextOnNetlify();

      // Next-on-netlify puts its files into out_functions and out_publish
      // Copy files from next-on-netlify's output to the right functions/publish dirs

      // TO-DO: use FUNCTIONS_DIST when internal bug is fixed
      const { PUBLISH_DIR } = constants;
      // if (!existsSync(FUNCTIONS_DIST)) {
      //   await makeDir(FUNCTIONS_DIST);
      // }
      if (!existsSync(PUBLISH_DIR)) {
        await makeDir(PUBLISH_DIR);
      }

      // TO-DO: make sure FUNCTIONS_DIST doesnt have a custom function name conflict
      // with function names that next-on-netlify can generate
      // cpx.copySync('out_functions/**/*', FUNCTIONS_SRC);
      cpx.copySync('out_publish/**/*', PUBLISH_DIR);
  }
}
