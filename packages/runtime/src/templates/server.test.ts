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

jest.mock(
  'prerender-manifest.json',
  () => ({
    routes: {
      '/en/getStaticProps/with-revalidate': {
        dataRoute: '/_next/data/en/getStaticProps/with-revalidate.json',
      },
    },
    dynamicRoutes: {
      '/blog/[author]/[slug]': {
        routeRegex: '^/blog/([^/]+?)/([^/]+?)(?:/)?$',
        dataRoute: '/blog/[author]/[slug].rsc',
      },
    },
  }),
  { virtual: true },
)

beforeAll(() => {
  const NextServer: NextServerType = getNextServer()
  jest.spyOn(NextServer.prototype, 'getRequestHandler').mockImplementation(() => () => Promise.resolve())

  const MockNetlifyNextServerConstructor = function () {
    this.distDir = '.'
    this.buildId = 'build-id'
    this.nextConfig = {
      i18n: {
        defaultLocale: 'en',
        locales: ['en', 'fr', 'de'],
      },
    }
  }
  Object.setPrototypeOf(NetlifyNextServer, MockNetlifyNextServerConstructor)
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

  it('matches a normalized static route to find the data route', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: {} }, {})
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = mockRequest(
      '/getStaticProps/with-revalidate/',
      { 'x-prerender-revalidate': 'test' },
      'GET',
    )
    await requestHandler(mockReq, mockRes)

    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          paths: ['/getStaticProps/with-revalidate/', '/_next/data/build-id/en/getStaticProps/with-revalidate.json'],
        }),
      }),
    )
  })

  it('matches a normalized dynamic route to find the data', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: {} }, {})
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = mockRequest('/blog/rob/hello', { 'x-prerender-revalidate': 'test' }, 'GET')
    await requestHandler(mockReq, mockRes)

    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          paths: ['/blog/rob/hello', '/blog/rob/hello.rsc'],
        }),
      }),
    )
  })

  it('throws an error when route is not found in the manifest', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: {} }, {})
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = mockRequest(
      '/not-a-valid-path/',
      { 'x-prerender-revalidate': 'test' },
      'GET',
    )

    await expect(requestHandler(mockReq, mockRes)).rejects.toThrow('could not find a route')
  })

  it('throws an error when paths are not found by the API', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: {} }, {})
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = mockRequest(
      '/getStaticProps/with-revalidate/',
      { 'x-prerender-revalidate': 'test' },
      'GET',
    )

    mockedApiFetch.mockResolvedValueOnce({ code: 500, message: 'Failed to revalidate' })
    await expect(requestHandler(mockReq, mockRes)).rejects.toThrow('Failed to revalidate')
  })

  it('throws an error when the revalidate API is unreachable', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: {} }, {})
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = mockRequest(
      '/getStaticProps/with-revalidate/',
      { 'x-prerender-revalidate': 'test' },
      'GET',
    )

    mockedApiFetch.mockRejectedValueOnce(new Error('Unable to connect'))
    await expect(requestHandler(mockReq, mockRes)).rejects.toThrow('Unable to connect')
  })
})
