// TEMPLATE: This file will be copied to the Netlify functions directory

// Render function for the Next.js page
const { Buffer } = require('buffer')
const http = require('http')
const queryString = require('querystring')
const Stream = require('stream')

// Mock a HTTP IncomingMessage object from the Netlify Function event parameters
// Based on API Gateway Lambda Compat
// Source: https://github.com/serverless-nextjs/serverless-next.js/blob/master/packages/compat-layers/apigw-lambda-compat/lib/compatLayer.js

const createRequestObject = ({ event, context }) => {
  const {
    requestContext = {},
    path = '',
    multiValueQueryStringParameters,
    pathParameters,
    httpMethod,
    multiValueHeaders = {},
    body,
    isBase64Encoded,
  } = event

  const newStream = new Stream.Readable()
  const req = Object.assign(newStream, http.IncomingMessage.prototype)
  req.url = (requestContext.path || path || '').replace(new RegExp(`^/${requestContext.stage}`), '') || '/'

  let qs = ''

  if (multiValueQueryStringParameters) {
    qs += queryString.stringify(multiValueQueryStringParameters)
  }

  if (pathParameters) {
    const pathParametersQs = queryString.stringify(pathParameters)

    qs += qs.length === 0 ? pathParametersQs : `&${pathParametersQs}`
  }

  const hasQueryString = qs.length !== 0

  if (hasQueryString) {
    req.url += `?${qs}`
  }

  req.method = httpMethod
  req.rawHeaders = []
  req.headers = {}

  // Expose Netlify Function event and callback on request object.
  // This makes it possible to access the clientContext, for example.
  // See: https://github.com/netlify/next-on-netlify/issues/20
  // It also allows users to change the behavior of waiting for empty event
  // loop.
  // See: https://github.com/netlify/next-on-netlify/issues/66#issuecomment-719988804
  req.netlifyFunctionParams = { event, context }

  for (const key of Object.keys(multiValueHeaders)) {
    for (const value of multiValueHeaders[key]) {
      req.rawHeaders.push(key)
      req.rawHeaders.push(value)
    }
    req.headers[key.toLowerCase()] = multiValueHeaders[key].toString()
  }

  req.getHeader = (name) => req.headers[name.toLowerCase()]
  req.getHeaders = () => req.headers

  req.connection = {}

  if (body) {
    req.push(body, isBase64Encoded ? 'base64' : undefined)
  }

  req.push(null)

  return req
}

// Mock a HTTP ServerResponse object that returns a Netlify Function-compatible
// response via the onResEnd callback when res.end() is called.
// Based on API Gateway Lambda Compat
// Source: https://github.com/serverless-nextjs/serverless-next.js/blob/master/packages/compat-layers/apigw-lambda-compat/lib/compatLayer.js

const createResponseObject = ({ onResEnd }) => {
  const response = {
    isBase64Encoded: true,
    multiValueHeaders: {},
  }

  const res = new Stream()
  Object.defineProperty(res, 'statusCode', {
    get() {
      return response.statusCode
    },
    set(statusCode) {
      response.statusCode = statusCode
    },
  })
  res.headers = {}
  res.writeHead = (status, headers) => {
    response.statusCode = status
    if (headers) res.headers = Object.assign(res.headers, headers)

    // Return res object to allow for chaining
    // Fixes: https://github.com/netlify/next-on-netlify/pull/74
    return res
  }
  res.write = (chunk) => {
    if (!response.body) {
      response.body = Buffer.from('')
    }

    response.body = Buffer.concat([
      Buffer.isBuffer(response.body) ? response.body : Buffer.from(response.body),
      Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk),
    ])
  }
  res.setHeader = (name, value) => {
    res.headers[name.toLowerCase()] = value
  }
  res.removeHeader = (name) => {
    delete res.headers[name.toLowerCase()]
  }
  res.getHeader = (name) => res.headers[name.toLowerCase()]
  res.getHeaders = () => res.headers
  res.hasHeader = (name) => Boolean(res.getHeader(name))
  res.end = (text) => {
    if (text) res.write(text)
    if (!res.statusCode) {
      res.statusCode = 200
    }

    if (response.body) {
      response.body = Buffer.from(response.body).toString('base64')
    }
    response.multiValueHeaders = res.headers
    res.writeHead(response.statusCode)

    // Convert all multiValueHeaders into arrays
    for (const key of Object.keys(response.multiValueHeaders)) {
      if (!Array.isArray(response.multiValueHeaders[key])) {
        response.multiValueHeaders[key] = [response.multiValueHeaders[key]]
      }
    }

    res.finished = true
    res.writableEnded = true
    // Call onResEnd handler with the response object
    onResEnd(response)
  }

  return res
}

// Render the Next.js page
const renderNextPage = ({ event, context }, nextPage) => {
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

const getHandlerFunction = (nextPage) => async (event, context) => {
  // x-forwarded-host is undefined on Netlify for proxied apps that need it
  // fixes https://github.com/netlify/next-on-netlify/issues/46
  if (!event.multiValueHeaders.hasOwnProperty('x-forwarded-host')) {
    // eslint-disable-next-line no-param-reassign
    event.multiValueHeaders['x-forwarded-host'] = [event.headers.host]
  }

  // Get the request URL
  const { path } = event
  console.log('[request]', path)

  // Render the Next.js page
  const response = await renderNextPage({ event, context }, nextPage)

  // Convert header values to string. Netlify does not support integers as
  // header values. See: https://github.com/netlify/cli/issues/451
  Object.keys(response.multiValueHeaders).forEach((key) => {
    response.multiValueHeaders[key] = response.multiValueHeaders[key].map((value) => String(value))
  })

  response.multiValueHeaders['Cache-Control'] = ['no-cache']

  return response
}

exports.getHandlerFunction = getHandlerFunction
