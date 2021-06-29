const { existsSync } = require('fs')
const { EOL } = require('os')
const path = require('path')

const checkNxConfig = ({ netlifyConfig, nextConfig, failBuild, constants: { PUBLISH_DIR = 'out' } }) => {
  const errors = []
  if (nextConfig.distDir === '.next') {
    errors.push(
      "- When using Nx you must set a value for 'distDir' in your next.config.js, and the value cannot be '.next'",
    )
  }
  // The PUBLISH_DIR constant is normalized, so no leading slash is needed
  if (!PUBLISH_DIR.startsWith('apps/')) {
    errors.push(
      "Please set the 'publish' value in your Netlify build config to a folder inside your app directory. e.g. 'apps/myapp/out'",
    )
  }

  // Look for the config file as a sibling of the publish dir
  const expectedConfigFile = path.resolve(netlifyConfig.build.publish || PUBLISH_DIR, '..', 'next.config.js')

  if (expectedConfigFile !== nextConfig.configFile) {
    const confName = path.relative(process.cwd(), nextConfig.configFile)
    errors.push(
      `- Using incorrect config file '${confName}'. Expected to use '${path.relative(
        process.cwd(),
        expectedConfigFile,
      )}'`,
    )

    if (existsSync(expectedConfigFile)) {
      errors.push(
        `Please move or delete '${confName}'${confName === 'next.config.js' ? ' from the root of your site' : ''}.`,
      )
    } else {
      errors.push(
        `Please move or delete '${confName}'${
          confName === 'next.config.js' ? ' from the root of your site' : ''
        }, and create '${path.relative(process.cwd(), expectedConfigFile)}' instead.`,
      )
    }
  }

  if (errors.length !== 0) {
    failBuild(
      // TODO: Add ntl.fyi link to docs
      [
        'Invalid configuration',
        ...errors,
        'See the docs on using Nx with Netlify for more information: https://ntl.fyi/nx-next',
      ].join(EOL),
    )
  }
}

module.exports = checkNxConfig
