/* eslint-disable max-nested-callbacks */
import { mockRequest } from 'next/dist/server/lib/mock-request'

import { getNextServer, NextServerType, netlifyApiFetch } from './handlerUtils'
import { NetlifyNextServer } from './server'

jest.mock('./handlerUtils', () => {
  const originalModule = jest.requireActual('./handlerUtils')

  return {
    __esModule: true,
    ...originalModule,
    netlifyApiFetch: jest.fn().mockResolvedValue({ ok: true }),
  }
})
const mockedApiFetch = netlifyApiFetch as jest.MockedFunction<typeof netlifyApiFetch>

beforeAll(() => {
  const NextServer: NextServerType = getNextServer()
  jest.spyOn(NextServer.prototype, 'getRequestHandler').mockImplementation(() => () => Promise.resolve())
  Object.setPrototypeOf(NetlifyNextServer, jest.fn())
})

describe('the netlify next server', () => {
  it('revalidates a request containing an `x-prerender-revalidate` header', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: {} }, {})
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = mockRequest(
      '/getStaticProps/with-revalidate/',
      { 'x-prerender-revalidate': 'test' },
      'GET',
    )
    const response = await requestHandler(mockReq, mockRes)

    expect(mockedApiFetch).toHaveBeenCalled()
    expect(response).toBe(undefined)
  })

  it('throws an error when invalid paths are revalidated', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: {} }, {})
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = mockRequest('/not-a-path/', { 'x-prerender-revalidate': 'test' }, 'GET')

    mockedApiFetch.mockResolvedValueOnce({ code: 404, message: 'Invalid paths' })
    await expect(requestHandler(mockReq, mockRes)).rejects.toThrow('Invalid paths')
  })

  it('throws an error when the revalidate API is unreachable', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: {} }, {})
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = mockRequest('', { 'x-prerender-revalidate': 'test' }, 'GET')

    mockedApiFetch.mockRejectedValueOnce(new Error('Unable to connect'))
    await expect(requestHandler(mockReq, mockRes)).rejects.toThrow('Unable to connect')
  })
})
/* eslint-enable max-nested-callbacks */
