const Stream = require('stream')
const queryString = require('querystring')
const http = require('http')

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
  req.url = (requestContext.path || path || '').replace(new RegExp('^/' + requestContext.stage), '') || '/'

  let qs = ''

  if (multiValueQueryStringParameters) {
    qs += queryString.stringify(multiValueQueryStringParameters)
  }

  if (pathParameters) {
    const pathParametersQs = queryString.stringify(pathParameters)

    if (qs.length > 0) {
      qs += `&${pathParametersQs}`
    } else {
      qs += pathParametersQs
    }
  }

  const hasQueryString = qs.length > 0

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

  req.getHeader = (name) => {
    return req.headers[name.toLowerCase()]
  }
  req.getHeaders = () => {
    return req.headers
  }

  req.connection = {}

  if (body) {
    req.push(body, isBase64Encoded ? 'base64' : undefined)
  }

  req.push(null)

  return req
}

module.exports = createRequestObject
