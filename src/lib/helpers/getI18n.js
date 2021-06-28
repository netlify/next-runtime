// Get the i18n details specified in next.config.js, if any
const getNextConfig = require('../../../helpers/getNextConfig')

const getI18n = async () => {
  const nextConfig = await getNextConfig()

  return nextConfig.i18n || { locales: [] }
}

module.exports = getI18n
