// Checks all the cases for which the plugin should do nothing
const { redBright, yellowBright } = require('chalk')

const doesSiteUseNextOnNetlify = require('./doesSiteUseNextOnNetlify')
const isStaticExportProject = require('./isStaticExportProject')
const usesBuildCommand = require('./usesBuildCommand')

const doesNotNeedPlugin = ({ netlifyConfig, packageJson }) => {
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
      yellowBright`Site seems to be building a Storybook rather than the Next.js site, so the Essential Next.js plugin will not run.`,
    )
    return true
  }

  return isStaticExportProject({ build, scripts }) || doesSiteUseNextOnNetlify({ packageJson })
}

module.exports = doesNotNeedPlugin
