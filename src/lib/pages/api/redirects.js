const getNetlifyFunctionName = require('../../helpers/getNetlifyFunctionName')
const getPages = require('./pages')

const getRedirects = async ({ publishPath }) => {
  const pages = await getPages({ publishPath })
  return pages.map(({ route, filePath }) => ({
    route,
    target: `/.netlify/functions/${getNetlifyFunctionName(filePath, true)}`,
  }))
}

module.exports = getRedirects
