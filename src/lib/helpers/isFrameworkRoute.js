// Return true if the route is one of the framework pages, such as _app or
// _error
const isFrameworkRoute = (route) => ['/_app', '/_document', '/_error'].includes(route)

module.exports = isFrameworkRoute
