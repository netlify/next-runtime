const { join } = require('path')

const slash = require('slash')

const { PREVIEW_MODE_COOKIES } = require('../../config')
const addLocaleRedirects = require('../../helpers/addLocaleRedirects')
const asyncForEach = require('../../helpers/asyncForEach')
const getFilePathForRoute = require('../../helpers/getFilePathForRoute')
const getNetlifyFunctionName = require('../../helpers/getNetlifyFunctionName')
const getPreviewModeFunctionName = require('../../helpers/getPreviewModeFunctionName')

const getPages = require('./pages')

const getRedirects = async () => {
  const redirects = []
  const pages = await getPages()

  await asyncForEach(pages, async ({ route, dataRoute }) => {
    const relativePath = getFilePathForRoute(route, 'js')
    const filePath = slash(join('pages', relativePath))
    const functionName = getNetlifyFunctionName(filePath)
    const target = `/.netlify/functions/${functionName}`
    const previewModeTarget = `/.netlify/functions/${getPreviewModeFunctionName(functionName)}`

    await addLocaleRedirects(redirects, route, target)

    // Add a redirect for preview mode pointing to the standard function
    redirects.push({
      route,
      target: previewModeTarget,
      conditions: PREVIEW_MODE_COOKIES,
      force: true,
      specialPreviewMode: true,
    })

    // Add one redirect pointing to the ODB
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
