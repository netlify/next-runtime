const Stream = require('stream')

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
  res.getHeader = (name) => {
    return res.headers[name.toLowerCase()]
  }
  res.getHeaders = () => {
    return res.headers
  }
  res.hasHeader = (name) => {
    return !!res.getHeader(name)
  }
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

module.exports = createResponseObject
