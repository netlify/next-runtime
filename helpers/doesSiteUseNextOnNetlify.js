// Checks if site is already using next-on-netlify
const { name: pluginName } = require('../package.json')

const doesSiteUseNextOnNetlify = ({ packageJson }) => {
  const { name, scripts = {}, dependencies = {} } = packageJson

  const hasNextOnNetlifyInstalled = dependencies['next-on-netlify'] !== undefined
  const hasNextOnNetlifyPostbuildScript =
    typeof scripts.postbuild === 'string' && scripts.postbuild.includes('next-on-netlify')
  const isUsingNextOnNetlify = (hasNextOnNetlifyInstalled || hasNextOnNetlifyPostbuildScript) && pluginName !== name
  if (isUsingNextOnNetlify) {
    console.log(
      `This plugin does not support sites that manually use next-on-netlify. Uninstall next-on-netlify as a dependency and/or remove it from your postbuild script to allow this plugin to run.`,
    )
  }

  return isUsingNextOnNetlify
}

module.exports = doesSiteUseNextOnNetlify
