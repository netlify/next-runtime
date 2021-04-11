const getNetlifyFunctionName = require('../../helpers/getNetlifyFunctionName')

const getPages = require('./pages')

const getRedirects = async () => {
  const pages = await getPages()
  return pages.map(({ route, filePath }) => ({
    route,
    target: `/.netlify/functions/${getNetlifyFunctionName(filePath, true)}`,
  }))
}

module.exports = getRedirects
