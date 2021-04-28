const addLocaleRedirects = require('../../helpers/addLocaleRedirects')
const asyncForEach = require('../../helpers/asyncForEach')
const getNetlifyFunctionName = require('../../helpers/getNetlifyFunctionName')

const getPages = require('./pages')

const getRedirects = async () => {
  const redirects = []
  const pages = await getPages()

  await asyncForEach(pages, async ({ route, filePath }) => {
    const functionName = getNetlifyFunctionName(filePath)
    const target = `/.netlify/functions/${functionName}`

    await addLocaleRedirects(redirects, route, target)

    redirects.push({
      route,
      target,
    })
  })

  return redirects
}

module.exports = getRedirects
