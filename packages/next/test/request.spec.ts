import Chance from 'chance'
import { NextURL } from 'next/dist/server/web/next-url'
import { NextCookies } from 'next/dist/server/web/spec-extension/cookies'
import { NextRequest } from 'next/server'
import { MiddlewareRequest } from '../src/middleware/request'

const chance = new Chance()

describe('MiddlewareRequest', () => {
  let nextRequest, mockHeaders, mockHeaderValue, requestId, geo, ip, url

  beforeEach(() => {
    globalThis.Deno = {}
    globalThis.NFRequestContextMap = new Map()

    ip = chance.ip()
    url = chance.url()

    const context = {
      geo: {
        country: {
          code: chance.country(),
        },
        subdivision: {
          code: chance.province(),
        },
        city: chance.city(),
      },
      ip,
    }

    geo = {
      country: context.geo.country?.code,
      region: context.geo.subdivision?.code,
      city: context.geo.city,
    }

    const req = new URL(url)

    requestId = chance.guid()
    globalThis.NFRequestContextMap.set(requestId, {
      request: req,
      context,
    })

    mockHeaders = new Headers()
    mockHeaderValue = chance.word()

    mockHeaders.append('foo', mockHeaderValue)
    mockHeaders.append('x-nf-request-id', requestId)

    const request = {
      headers: mockHeaders,
      geo,
      method: 'GET',
      ip: context.ip,
      body: null,
    }

    nextRequest = new NextRequest(req, request)
  })

  afterEach(() => {
    nextRequest = null
    requestId = null
    delete globalThis.Deno
    delete globalThis.NFRequestContextMap
  })

  it('throws an error when MiddlewareRequest is run outside of edge environment', () => {
    delete globalThis.Deno
    expect(() => new MiddlewareRequest(nextRequest)).toThrowError(
      'MiddlewareRequest only works in a Netlify Edge Function environment',
    )
  })

  it('throws an error when x-nf-request-id header is missing', () => {
    nextRequest.headers.delete('x-nf-request-id')
    expect(() => new MiddlewareRequest(nextRequest)).toThrowError('Missing x-nf-request-id header')
  })

  it('throws an error when request context is missing', () => {
    globalThis.NFRequestContextMap.delete(requestId)
    expect(() => new MiddlewareRequest(nextRequest)).toThrowError(
      `Could not find request context for request id ${requestId}`,
    )
  })

  it('returns the headers object', () => {
    const mwRequest = new MiddlewareRequest(nextRequest)
    expect(mwRequest.headers).toStrictEqual(mockHeaders)
  })

  it('returns the cookies object', () => {
    const mwRequest = new MiddlewareRequest(nextRequest)
    expect(mwRequest.cookies).toBeInstanceOf(NextCookies)
  })

  it('returns the geo object', () => {
    const mwRequest = new MiddlewareRequest(nextRequest)
    expect(mwRequest.geo).toStrictEqual(geo)
  })

  it('returns the ip object', () => {
    const mwRequest = new MiddlewareRequest(nextRequest)
    expect(mwRequest.ip).toStrictEqual(ip)
  })

  it('returns the nextUrl object', () => {
    const mwRequest = new MiddlewareRequest(nextRequest)
    expect(mwRequest.nextUrl).toBeInstanceOf(NextURL)
  })

  it('returns the url', () => {
    const mwRequest = new MiddlewareRequest(nextRequest)
    expect(mwRequest.url).toEqual(url)
  })
})
