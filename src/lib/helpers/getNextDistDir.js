// Get the NextJS distDir specified in next.config.js
const { join } = require('path')

const getNextConfig = require('../../../helpers/getNextConfig')
const { defaultFailBuild } = require('../../../helpers/defaultFailBuild')

const getNextDistDir = async (publishPath) => {
  const nextConfig = await getNextConfig({ failBuild: defaultFailBuild, publishPath })

  return join('.', nextConfig.distDir)
}

module.exports = getNextDistDir
