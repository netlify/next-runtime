// Get the i1i8n details specified in next.config.js, if any
const getNextConfig = require('../../../helpers/getNextConfig')

const getI18n = async ({ publishPath }) => {
  const nextConfig = await getNextConfig({ publishPath })

  return nextConfig.i18n || { locales: [] }
}

module.exports = getI18n
