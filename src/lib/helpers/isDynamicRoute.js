// Return true if the route uses dynamic routing (e.g., [id] or [...slug])
// (taken from @sls-next/lambda-at-edge)

const isDynamicRoute = (route) => /\/\[[^/]+?](?=\/|$)/.test(route)

module.exports = isDynamicRoute
