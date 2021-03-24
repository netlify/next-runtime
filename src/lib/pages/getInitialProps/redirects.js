const addLocaleRedirects = require('../../helpers/addLocaleRedirects')
const getNetlifyFunctionName = require('../../helpers/getNetlifyFunctionName')
const asyncForEach = require('../../helpers/asyncForEach')
const getPages = require('./pages')

const getRedirects = async ({ publishPath }) => {
  const redirects = []
  const pages = await getPages({ publishPath })

  await asyncForEach(pages, async ({ route, filePath }) => {
    const functionName = getNetlifyFunctionName(filePath)
    const target = `/.netlify/functions/${functionName}`

    await addLocaleRedirects({ redirects, route, target, publishPath })

    redirects.push({
      route,
      target,
    })
  })

  return redirects
}

module.exports = getRedirects
