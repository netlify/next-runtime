// Checks all the cases for which the plugin should do nothing
const doesSiteUseNextOnNetlify = require('./doesSiteUseNextOnNetlify')
const isStaticExportProject = require('./isStaticExportProject')

const doesNotNeedPlugin = ({ netlifyConfig, packageJson }) => {
  const { build } = netlifyConfig
  const { scripts = {} } = packageJson

  return isStaticExportProject({ build, scripts }) || doesSiteUseNextOnNetlify({ packageJson })
}

module.exports = doesNotNeedPlugin
