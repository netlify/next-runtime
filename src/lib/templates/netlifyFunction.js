// TEMPLATE: This file will be copied to the Netlify functions directory when
//           running next-on-netlify

// Render function for the Next.js page
const renderNextPage = require('./renderNextPage')

exports.handler = async (event, context, callback) => {
  // x-forwarded-host is undefined on Netlify for proxied apps that need it
  // fixes https://github.com/netlify/next-on-netlify/issues/46
  if (!event.multiValueHeaders.hasOwnProperty('x-forwarded-host')) {
    event.multiValueHeaders['x-forwarded-host'] = [event.headers['host']]
  }

  // Get the request URL
  const { path } = event
  console.log('[request]', path)

  // Render the Next.js page
  const response = await renderNextPage({ event, context })

  // Convert header values to string. Netlify does not support integers as
  // header values. See: https://github.com/netlify/cli/issues/451
  Object.keys(response.multiValueHeaders).forEach((key) => {
    response.multiValueHeaders[key] = response.multiValueHeaders[key].map((value) => String(value))
  })

  response.multiValueHeaders['Cache-Control'] = ['no-cache']

  callback(null, response)
}
