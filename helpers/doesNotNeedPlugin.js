// Checks all the cases for which the plugin should do nothing
const { redBright } = require('chalk')

const doesSiteUseNextOnNetlify = require('./doesSiteUseNextOnNetlify')
const isStaticExportProject = require('./isStaticExportProject')

const doesNotNeedPlugin = ({ netlifyConfig, packageJson }) => {
  const { build } = netlifyConfig
  const { scripts = {} } = packageJson

  if (!build.command) {
    console.log(
      redBright`⚠️  Warning: No build command specified in the site's Netlify config, so plugin will not run. This deploy will fail unless you have already exported the site.  ⚠️`,
    )
    return true
  }

  return isStaticExportProject({ build, scripts }) || doesSiteUseNextOnNetlify({ packageJson })
}

module.exports = doesNotNeedPlugin
