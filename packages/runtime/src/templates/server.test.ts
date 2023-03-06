import { mockRequest } from 'next/dist/server/lib/mock-request'

import { netlifyApiFetch, getNextServer, NextServerType } from './handlerUtils'
import { NetlifyNextServer } from './server'

const NextServer: NextServerType = getNextServer()

jest.mock('./handlerUtils', () => {
  const originalModule = jest.requireActual('./handlerUtils')

  return {
    __esModule: true,
    ...originalModule,
    netlifyApiFetch: jest.fn(({ payload }) => {
      switch (payload.paths[0]) {
        case '/getStaticProps/with-revalidate/':
          return Promise.resolve({ code: 200, message: 'Revalidated' })
        case '/not-a-path/':
          return Promise.resolve({ code: 404, message: '404' })
        default:
          return Promise.reject(new Error('Error'))
      }
    }),
  }
})

jest.spyOn(NextServer.prototype, 'getRequestHandler').mockImplementation(() => () => Promise.resolve())

Object.setPrototypeOf(NetlifyNextServer, jest.fn())

const nextServer = new NetlifyNextServer({ conf: {}, dev: false })
const requestHandler = nextServer.getRequestHandler()

describe('the netlify next server', () => {
  it('intercepts a request containing an x-prerender-revalidate header', async () => {
    const { req: mockReq, res: mockRes } = mockRequest(
      '/getStaticProps/with-revalidate/',
      { 'x-prerender-revalidate': 'test' },
      'GET',
    )
    await requestHandler(mockReq, mockRes)
    expect(netlifyApiFetch).toHaveBeenCalled()
  })

  it('silently revalidates and returns the original handler response', async () => {
    const { req: mockReq, res: mockRes } = mockRequest(
      '/getStaticProps/with-revalidate/',
      { 'x-prerender-revalidate': 'test' },
      'GET',
    )
    await expect(requestHandler(mockReq, mockRes)).resolves.toBe(undefined)
  })

  it('throws an error when the revalidate API returns a 404 response', async () => {
    const { req: mockReq, res: mockRes } = mockRequest('/not-a-path/', { 'x-prerender-revalidate': 'test' }, 'GET')
    await expect(requestHandler(mockReq, mockRes)).rejects.toThrow('Unsuccessful revalidate - 404')
  })

  it('throws an error when the revalidate API is unreachable', async () => {
    const { req: mockReq, res: mockRes } = mockRequest('', { 'x-prerender-revalidate': 'test' }, 'GET')
    await expect(requestHandler(mockReq, mockRes)).rejects.toThrow('Unsuccessful revalidate - Error')
  })
})
