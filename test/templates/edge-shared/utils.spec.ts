import {updateModifiedHeaders, FetchEventResult} from '../../../packages/runtime/src/templates/edge-shared/utils'

describe('updateModifiedHeaders', () => {
  it('does not modify the headers if \'x-middleware-override-headers\' is not found', () => {
    const mockHeaders = new Headers()
    // There shouldn't be a case where x-middleware-override-headers is not set and a header has
    // been modified with 'x-middleware-request' added to it, this is more to confirm the test case
    mockHeaders.set('x-middleware-request-foo', 'bar')

    let mockResult: FetchEventResult = {
      response: new Response('', {headers: mockHeaders}),
      waitUntil: Promise.resolve()
    }

    mockResult.response = updateModifiedHeaders(mockResult.response)

    expect(mockResult.response.headers.get('x-middleware-request-foo')).toEqual('bar')
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
      expect(mockResult.response.headers.get('foo')).toEqual('bar')
    })
    
    it('removes \'x-middleware-request-\' from headers', () => {
      expect(mockResult.response.headers.get('x-middleware-request-hello')).toBe(null)
      expect(mockResult.response.headers.get('x-middleware-request-test')).toBe(null)

      expect(mockResult.response.headers.get('hello')).toEqual('world')
      expect(mockResult.response.headers.get('test')).toEqual('123')
    })
    
    it('removes \'x-middleware-override-headers\' after cleaning headers', () => {
      expect(mockResult.response.headers.get('x-middleware-override-headers')).toBe(null)
    })
  })
})
