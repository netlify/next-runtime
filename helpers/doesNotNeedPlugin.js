const findUp = require('find-up')

// Checks all the cases for which the plugin should do nothing
const isStaticExportProject = require('./isStaticExportProject')
const doesSiteUseNextOnNetlify = require('./doesSiteUseNextOnNetlify')
const hasCorrectNextConfig = require('./hasCorrectNextConfig')

const doesNotNeedPlugin = async ({ netlifyConfig, packageJson }) => {
  const { build } = netlifyConfig
  const { name, scripts = {} } = packageJson
  const nextConfigPath = await findUp('next.config.js')

  return (
    isStaticExportProject({ build, scripts }) ||
    doesSiteUseNextOnNetlify({ packageJson }) ||
    !hasCorrectNextConfig(nextConfigPath)
  )
}

module.exports = doesNotNeedPlugin
