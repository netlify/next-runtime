// Load the NextJS page
const nextPage = require('./nextPage')
const createRequestObject = require('./createRequestObject')
const createResponseObject = require('./createResponseObject')

// Render the Next.js page
const renderNextPage = ({ event, context }) => {
  // The Next.js page is rendered inside a promise that is resolved when the
  // Next.js page ends the response via `res.end()`
  const promise = new Promise((resolve) => {
    // Create a Next.js-compatible request and response object
    // These mock the ClientRequest and ServerResponse classes from node http
    // See: https://nodejs.org/api/http.html
    const req = createRequestObject({ event, context })
    const res = createResponseObject({
      onResEnd: (response) => resolve(response),
    })

    // Check if page is a Next.js page or an API route
    const isNextPage = nextPage.render instanceof Function
    const isApiRoute = !isNextPage

    // Perform the render: render() for Next.js page or default() for API route
    if (isNextPage) return nextPage.render(req, res)
    if (isApiRoute) return nextPage.default(req, res)
  })

  // Return the promise
  return promise
}

module.exports = renderNextPage
