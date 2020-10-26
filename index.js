const fs = require('fs');
const { existsSync, readFileSync } = require('fs');
const path = require('path');
const { appendFile, readdir } = require('fs').promises;
const { listFrameworks } = require('@netlify/framework-info');
const nextOnNetlify = require('next-on-netlify');
const { PHASE_PRODUCTION_BUILD } = require('next/constants');
const { default: loadConfig } = require('next/dist/next-server/server/config');
const makeDir = require('make-dir');
const cpx = require('cpx');

const _isNextProject = async () => {
  const frameworks = await listFrameworks();
  return !!frameworks.find(({ name }) => name === 'next');
};

// TO-DO:
// - add try catches and error handling
// - edge cases:
//    - making sure functions_dir doesnt have a custom function named something that NoN could generate

// * Helpful Plugin Context *
// - Between the prebuild and build steps, the project's build command is run
// - Between the build and postbuild steps, any functions are bundled

module.exports = {
  async onPreBuild({ constants, netlifyConfig, utils }) {
    const isNextProject = await _isNextProject();
    const { build } = netlifyConfig;
    const { failBuild } = utils.build;

    if (isNextProject) {
      // TO-DO: read scripts from package.json and test this there
      const isStaticExport = build && build.command && build.command.includes('next export');
      if (isStaticExport) {
        failBuild(`** Static HTML export next.js projects do not require this plugin **`);
      }

      // TO-DO: read dependencies from package.json
      // fail build if next-on-netlify is already installed or in a script?

      const hasFunctionsDirectorySet = build && netlifyConfig.functions;
      if (!hasFunctionsDirectorySet) {
        failBuild
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
    } else {
      failBuild(`This application does not use Next.js.`);
    }
  },
  async onBuild({ constants }) {
    const isNextProject = await _isNextProject();

    if (isNextProject) {
      console.log(`** Running Next on Netlify package **`);
      nextOnNetlify();

      // Next-on-netlify puts its files into out_functions and out_publish
      // Copy files from next-on-netlify's output to the right functions/publish dirs
      const { FUNCTIONS_DIST, PUBLISH_DIR } = constants;
      await makeDir(FUNCTIONS_DIST);
      await makeDir(PUBLISH_DIR);
      cpx.copySync('out_functions/**/*', FUNCTIONS_DIST);
      cpx.copySync('out_publish/**/*', PUBLISH_DIR);
    }
  },
  async onPostBuild({ constants }) {
    const { FUNCTIONS_DIST, PUBLISH_DIR } = constants;
    await makeDir(FUNCTIONS_DIST);
    await makeDir(PUBLISH_DIR);
    cpx.copySync('out_functions/**/*', FUNCTIONS_DIST);
    cpx.copySync('out_publish/**/*', PUBLISH_DIR);
  }
}
