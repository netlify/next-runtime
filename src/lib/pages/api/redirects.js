const getNetlifyFunctionName = require('../../helpers/getNetlifyFunctionName')
const pages = require('./pages')

const redirects = pages.map(({ route, filePath }) => ({
  route,
  target: `/.netlify/functions/${getNetlifyFunctionName(filePath, true)}`,
}))

module.exports = redirects
