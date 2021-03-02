const { join } = require('path')
const { readFileSync } = require('fs-extra')
const { NEXT_DIST_DIR } = require('../config')
const getFilePathForRoute = require('./getFilePathForRoute')

// Get build ID that is used for data routes, e.g. /_next/data/BUILD_ID/...
const fileContents = readFileSync(join(NEXT_DIST_DIR, 'BUILD_ID'))
const buildId = fileContents.toString()

const getPlainDataRoute = (route) => {
  const filePath = getFilePathForRoute(route, 'json')
  return `/_next/data/${buildId}${filePath}`
}

const getI18nDataRoute = (route, locale) => {
  const filePath = getFilePathForRoute(route, 'json')
  return route === '/' ? getPlainDataRoute(`/${locale}`) : `/_next/data/${buildId}/${locale}${filePath}`
}

// Return the data route for the given route
const getDataRouteForRoute = (route, locale) => {
  if (locale) return getI18nDataRoute(route, locale)
  return getPlainDataRoute(route)
}

module.exports = getDataRouteForRoute
