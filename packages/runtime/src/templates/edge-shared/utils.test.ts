import { assertEquals } from 'https://deno.land/std@0.167.0/testing/asserts.ts'
import {
  beforeEach,
  describe,
  it,
} from "https://deno.land/std@0.167.0/testing/bdd.ts";
import {updateModifiedHeaders, FetchEventResult} from './utils.ts'


describe('updateModifiedHeaders', () => {
  it('does not modify the headers if \'x-middleware-override-headers\' is not found', () => {
    const mockHeaders = new Headers()
    // There shouldn't be a case where x-middleware-override-headers is not set and a header has
    // been modified with 'x-middleware-request' added to it, this is more to confirm the test case
    mockHeaders.set('x-middleware-request-foo', 'bar')

    const mockResult: FetchEventResult = {
      response: new Response('', {headers: mockHeaders}),
      waitUntil: Promise.resolve()
    }

    mockResult.response = updateModifiedHeaders(mockResult.response)

    assertEquals(mockResult.response.headers.get('x-middleware-request-foo'), 'bar')
  })

  describe('when the \'x-middleware-override-headers\' headers is present', () => {
    let mockHeaders
    let mockResult: FetchEventResult

    beforeEach(() => {
      mockHeaders = new Headers()
      mockHeaders.set('foo', 'bar')
      mockHeaders.set('x-middleware-request-hello', 'world')
      mockHeaders.set('x-middleware-request-test', '123')
      mockHeaders.set('x-middleware-override-headers', 'hello,test')
  
      mockResult = {
        response: new Response('', {headers: mockHeaders}),
        waitUntil: Promise.resolve()
      }
  
      mockResult.response = updateModifiedHeaders(mockResult.response)
  
    })

    it('does not modify headers that are missing \'x-middleware-request\' in the name', () => {
      assertEquals(mockResult.response.headers.get('foo'), 'bar')
    })
    
    it('removes \'x-middleware-request-\' from headers', () => {
      assertEquals(mockResult.response.headers.get('x-middleware-request-hello'), null)
      assertEquals(mockResult.response.headers.get('x-middleware-request-test'), null)

      assertEquals(mockResult.response.headers.get('hello'), 'world')
      assertEquals(mockResult.response.headers.get('test'), '123')
    })
    
    it('removes \'x-middleware-override-headers\' after cleaning headers', () => {
      assertEquals(mockResult.response.headers.get('x-middleware-override-headers'), null)
    })
  })
})
