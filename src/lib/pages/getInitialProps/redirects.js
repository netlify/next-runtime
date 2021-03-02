const addLocaleRedirects = require('../../helpers/addLocaleRedirects')
const getNetlifyFunctionName = require('../../helpers/getNetlifyFunctionName')
const pages = require('./pages')

const redirects = []

pages.forEach(({ route, filePath }) => {
  const functionName = getNetlifyFunctionName(filePath)
  const target = `/.netlify/functions/${functionName}`

  addLocaleRedirects(redirects)(route, target)

  redirects.push({
    route,
    target,
  })
})

module.exports = redirects
