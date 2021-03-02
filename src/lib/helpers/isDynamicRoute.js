// Return true if the route uses dynamic routing (e.g., [id] or [...slug])
const { default: isDynamicRoute } = require('@sls-next/lambda-at-edge/dist/lib/isDynamicRoute')

module.exports = isDynamicRoute
