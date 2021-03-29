// Get the NextJS distDir specified in next.config.js
const { join } = require('path')
const getNextConfig = require('../../../helpers/getNextConfig')

const getNextDistDir = async () => {
  const nextConfig = await getNextConfig(process.cwd())

  return join('.', nextConfig.distDir)
}

module.exports = getNextDistDir
