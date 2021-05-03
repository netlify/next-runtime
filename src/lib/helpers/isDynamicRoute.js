// Return true if the route uses dynamic routing (e.g., [id] or [...slug])
// @sls-next <= 1.7.0 uses default, >= 1.8.0 no longer does
const {
  default: oldIsDynamicRoute,
  isDynamicRoute = oldIsDynamicRoute,
} = require('@sls-next/lambda-at-edge/dist/lib/isDynamicRoute')

module.exports = isDynamicRoute
