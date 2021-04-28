const { join } = require('path')

const { readFileSync } = require('fs-extra')

const getFilePathForRoute = require('./getFilePathForRoute')
const getNextDistDir = require('./getNextDistDir')

const getPlainDataRoute = (route, buildId) => {
  const filePath = getFilePathForRoute(route, 'json')
  return `/_next/data/${buildId}${filePath}`
}

const getI18nDataRoute = (route, locale, buildId) => {
  const filePath = getFilePathForRoute(route, 'json')
  return route === '/' ? getPlainDataRoute(`/${locale}`, buildId) : `/_next/data/${buildId}/${locale}${filePath}`
}

// Return the data route for the given route
const getDataRouteForRoute = async (route, locale) => {
  const nextDistDir = await getNextDistDir()

  // Get build ID that is used for data routes, e.g. /_next/data/BUILD_ID/...
  const fileContents = readFileSync(join(nextDistDir, 'BUILD_ID'))
  const buildId = fileContents.toString()

  if (locale) return getI18nDataRoute(route, locale, buildId)
  return getPlainDataRoute(route, buildId)
}

module.exports = getDataRouteForRoute
