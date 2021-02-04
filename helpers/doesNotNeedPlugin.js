// Checks all the cases for which the plugin should do nothing
const isStaticExportProject = require('./isStaticExportProject')
const doesSiteUseNextOnNetlify = require('./doesSiteUseNextOnNetlify')
const hasCorrectNextConfig = require('./hasCorrectNextConfig')

const doesNotNeedPlugin = ({ netlifyConfig, packageJson, nextConfigPath }) => {
  const { build } = netlifyConfig
  const { name, scripts = {} } = packageJson

  return (
    isStaticExportProject({ build, scripts }) ||
    doesSiteUseNextOnNetlify({ packageJson }) ||
    !hasCorrectNextConfig(nextConfigPath)
  )
}

module.exports = doesNotNeedPlugin
