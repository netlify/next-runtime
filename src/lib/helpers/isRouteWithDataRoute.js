const getRoutesManifest = require('./getRoutesManifest')

// Return true if the route has a data route in the routes manifest
const isRouteWithDataRoute = async (route) => {
  const { dataRoutes } = await getRoutesManifest()

  // If no data routes exist, return false
  if (dataRoutes == null) return false

  return dataRoutes.find((dataRoute) => dataRoute.page === route)
}

module.exports = isRouteWithDataRoute
