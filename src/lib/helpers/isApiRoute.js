// Return true if the route is an API route
const isApiRoute = (route) => {
  return route.startsWith('/api/')
}

module.exports = isApiRoute
