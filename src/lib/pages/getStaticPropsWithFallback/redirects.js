const { join } = require('path')
const addLocaleRedirects = require('../../helpers/addLocaleRedirects')
const getFilePathForRoute = require('../../helpers/getFilePathForRoute')
const getNetlifyFunctionName = require('../../helpers/getNetlifyFunctionName')
const getPages = require('./pages')
const asyncForEach = require('../../helpers/asyncForEach')

const getRedirects = async ({ publishPath }) => {
  const redirects = []
  const pages = await getPages({ publishPath })

  await asyncForEach(pages, async ({ route, dataRoute }) => {
    const relativePath = getFilePathForRoute(route, 'js')
    const filePath = join('pages', relativePath)
    const functionName = getNetlifyFunctionName(filePath)
    const target = `/.netlify/functions/${functionName}`

    await addLocaleRedirects({ redirects, route, target, publishPath })

    // Add one redirect for the page
    redirects.push({
      route,
      target,
    })

    // Add one redirect for the data route
    redirects.push({
      route: dataRoute,
      target,
    })
  })
  return redirects
}

module.exports = getRedirects
