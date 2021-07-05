const resolveNextModule = require('../../../helpers/resolveNextModule')

const removeFileExtension = require('./removeFileExtension')

// Return an array of redirects sorted in order of specificity, i.e., more generic
// routes precede more specific ones
const getSortedRedirects = (redirects) => {
  // The @sls-next getSortedRoutes does not correctly sort routes with file
  // endings (e.g., json), so we remove them before sorting and add them back
  // after sorting
  const routesWithoutExtensions = redirects.map(({ route }) => removeFileExtension(route))

  // Sort the "naked" routes
  // eslint-disable-next-line import/no-dynamic-require
  const { getSortedRoutes } = require(resolveNextModule(
    [
      // next <= 11.0.1
      'next/dist/next-server/lib/router/utils/sorted-routes',
      // next > 11.0.1
      'next/dist/shared/lib/router/utils/sorted-routes',
    ],
    process.cwd(),
  ))
  const sortedRoutes = getSortedRoutes(routesWithoutExtensions)

  // Return original routes in the sorted order
  return redirects.sort((a, b) => {
    // If routes are different, sort according to Next.js' getSortedRoutes
    if (a.route !== b.route) {
      return sortedRoutes.indexOf(removeFileExtension(a.route)) - sortedRoutes.indexOf(removeFileExtension(b.route))
    }
    // Otherwise, put the route with more conditions first
    return (b.conditions || []).length - (a.conditions || []).length
  })
}

module.exports = getSortedRedirects
