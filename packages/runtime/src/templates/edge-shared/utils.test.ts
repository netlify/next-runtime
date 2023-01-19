import { assertEquals } from 'https://deno.land/std@0.167.0/testing/asserts.ts'
import { beforeEach, describe, it } from 'https://deno.land/std@0.167.0/testing/bdd.ts'
import { redirectTrailingSlash, updateModifiedHeaders } from './utils.ts'

describe('updateModifiedHeaders', () => {
  it("does not modify the headers if 'x-middleware-override-headers' is not found", () => {
    const mockHeaders = new Headers()
    // There shouldn't be a case where x-middleware-override-headers is not set and a header has
    // been modified with 'x-middleware-request' added to it, this is more to confirm the test case
    mockHeaders.set('x-middleware-request-foo', 'bar')

    const mockResponse = {
      headers: mockHeaders,
    }

    const mockRequest = {
      headers: new Headers(),
    }

    updateModifiedHeaders(mockRequest.headers, mockResponse.headers)

    assertEquals(mockRequest.headers.get('x-middleware-request-foo'), null)
  })

  describe("when the 'x-middleware-override-headers' headers is present", () => {
    let mockHeaders
    let mockRequest: { headers: Headers }
    let mockResponse: { headers: Headers }

    beforeEach(() => {
      mockHeaders = new Headers()
      mockHeaders.set('foo', 'bar')
      mockHeaders.set('x-middleware-request-hello', 'world')
      mockHeaders.set('x-middleware-request-test', '123')
      mockHeaders.set('x-middleware-override-headers', 'hello,test')

      mockRequest = {
        headers: new Headers(),
      }

      mockResponse = {
        headers: mockHeaders,
      }

      updateModifiedHeaders(mockRequest.headers, mockResponse.headers)
    })

    it("does not modify or add headers that are missing 'x-middleware-request' in the name", () => {
      assertEquals(mockRequest.headers.get('foo'), null)
    })

    it("removes 'x-middleware-request-' from headers", () => {
      assertEquals(mockRequest.headers.get('x-middleware-request-hello'), null)
      assertEquals(mockRequest.headers.get('x-middleware-request-test'), null)

      assertEquals(mockRequest.headers.get('hello'), 'world')
      assertEquals(mockRequest.headers.get('test'), '123')
    })

    it("removes 'x-middleware-override-headers' after cleaning headers", () => {
      assertEquals(mockRequest.headers.get('x-middleware-override-headers'), null)
    })
  })
})

describe('trailing slash redirects', () => {
  it('adds a trailing slash to the pathn if trailingSlash is enabled', () => {
    const url = new URL('https://example.com/foo')
    const result = redirectTrailingSlash(url, true)
    assertEquals(result?.status, 308)
    assertEquals(result?.headers.get('location'), 'https://example.com/foo/')
  })

  it("doesn't add a trailing slash if trailingSlash is false", () => {
    const url = new URL('https://example.com/foo')
    const result = redirectTrailingSlash(url, false)
    assertEquals(result, undefined)
  })

  it("doesn't add a trailing slash if the path is a file", () => {
    const url = new URL('https://example.com/foo.txt')
    const result = redirectTrailingSlash(url, true)
    assertEquals(result, undefined)
  })
  it('adds a trailing slash if there is a dot in the path', () => {
    const url = new URL('https://example.com/foo.bar/baz')
    const result = redirectTrailingSlash(url, true)
    assertEquals(result?.status, 308)
    assertEquals(result?.headers.get('location'), 'https://example.com/foo.bar/baz/')
  })
  it("doesn't add a trailing slash if the path is /", () => {
    const url = new URL('https://example.com/')
    const result = redirectTrailingSlash(url, true)
    assertEquals(result, undefined)
  })
  it('removes a trailing slash from the path if trailingSlash is false', () => {
    const url = new URL('https://example.com/foo/')
    const result = redirectTrailingSlash(url, false)
    assertEquals(result?.status, 308)
    assertEquals(result?.headers.get('location'), 'https://example.com/foo')
  })
  it("doesn't remove a trailing slash if trailingSlash is true", () => {
    const url = new URL('https://example.com/foo/')
    const result = redirectTrailingSlash(url, true)
    assertEquals(result, undefined)
  })

  it('removes a trailing slash from the path if the path is a file', () => {
    const url = new URL('https://example.com/foo.txt/')
    const result = redirectTrailingSlash(url, false)
    assertEquals(result?.status, 308)
    assertEquals(result?.headers.get('location'), 'https://example.com/foo.txt')
  })
})
