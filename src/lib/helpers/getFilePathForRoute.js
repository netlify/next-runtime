// Return the file for the given route
const getFilePathForRoute = (route, extension, locale) => {
  // Replace / with /index
  const path = route.replace(/^\/$/, '/index')

  if (locale) return `${locale}${path}.${extension}`
  return `${path}.${extension}`
}

module.exports = getFilePathForRoute
