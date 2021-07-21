// Checks all the cases for which the plugin should do nothing
const { redBright, yellowBright } = require('chalk')

const doesSiteUseNextOnNetlify = require('./doesSiteUseNextOnNetlify')
const isStaticExportProject = require('./isStaticExportProject')
const usesBuildCommand = require('./usesBuildCommand')

const doesNotNeedPlugin = ({ netlifyConfig, packageJson }) => {
  // The env var skips the auto-detection
  const envVar = process.env.NEXT_PLUGIN_FORCE_RUN
  if (envVar === 'false' || envVar === '0' || envVar === false) {
    console.log(
      yellowBright`The env var NEXT_PLUGIN_FORCE_RUN was set to ${JSON.stringify(
        envVar,
      )}, so auto-detection is disabled and the plugin will not run`,
    )
    return true
  }
  if (envVar === 'true' || envVar === '1' || envVar === true) {
    console.log(
      yellowBright`The env var NEXT_PLUGIN_FORCE_RUN was set to ${JSON.stringify(
        envVar,
      )}, so auto-detection is disabled and the plugin will run regardless`,
    )
    return false
  }
  // Otherwise use auto-detection

  const { build } = netlifyConfig
  const { scripts = {} } = packageJson

  if (!build.command) {
    console.log(
      redBright`⚠️  Warning: No build command specified in the site's Netlify config, so plugin will not run. This deploy will fail unless you have already exported the site.  ⚠️`,
    )
    return true
  }

  if (usesBuildCommand({ build, scripts, command: 'build-storybook' })) {
    console.log(
      yellowBright`Site seems to be building a Storybook rather than the Next.js site, so the Essential Next.js plugin will not run. If this is incorrect, set NEXT_PLUGIN_FORCE_RUN to true`,
    )
    return true
  }

  return isStaticExportProject({ build, scripts }) || doesSiteUseNextOnNetlify({ packageJson })
}

module.exports = doesNotNeedPlugin
