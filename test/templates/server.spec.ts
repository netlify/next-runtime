import { mockRequest } from 'next/dist/server/lib/mock-request'
import { Options } from 'next/dist/server/next-server'

import { NextServerType, netlifyApiFetch } from '../../packages/runtime/src/templates/handlerUtils'
import { getNextServerModulePath } from '../../packages/runtime/src/helpers/files'
import { getNetlifyNextServer, NetlifyNextServerType, NetlifyConfig } from '../../packages/runtime/src/templates/server'

jest.mock('../../packages/runtime/src/templates/handlerUtils', () => {
  const originalModule = jest.requireActual('../../packages/runtime/src/templates/handlerUtils')

  return {
    __esModule: true,
    ...originalModule,
    netlifyApiFetch: jest.fn().mockResolvedValue({ ok: true }),
  }
})
const mockedApiFetch = netlifyApiFetch as jest.MockedFunction<typeof netlifyApiFetch>

const mocki18nConfig = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fr', 'de'],
  },
}

const mockTokenConfig = {
  revalidateToken: 'test',
}

const mockBuildId = 'build-id'

jest.mock(
  'prerender-manifest.json',
  () => ({
    routes: {
      '/non-i18n/with-revalidate': {
        dataRoute: `/_next/data/${mockBuildId}/non-i18n/with-revalidate.json`,
      },
      '/en/i18n/with-revalidate': {
        dataRoute: `/_next/data/${mockBuildId}/i18n/with-revalidate.json`,
      },
    },
    dynamicRoutes: {
      '/posts/[title]': {
        routeRegex: '^/posts/([^/]+?)(?:/)?$',
        dataRoute: `/_next/data/${mockBuildId}/posts/[title].json`,
      },
      '/blog/[author]/[slug]': {
        routeRegex: '^/blog/([^/]+?)/([^/]+?)(?:/)?$',
        dataRoute: '/blog/[author]/[slug].rsc',
      },
    },
  }),
  { virtual: true },
)

let NetlifyNextServer: NetlifyNextServerType
beforeAll(() => {
  const NextServer: NextServerType = require(getNextServerModulePath(__dirname)).default
  jest.spyOn(NextServer.prototype, 'getRequestHandler').mockImplementation(() => () => Promise.resolve())
  NetlifyNextServer = getNetlifyNextServer(NextServer)

  const MockNetlifyNextServerConstructor = function (nextOptions: Options, netlifyConfig: NetlifyConfig) {
    this.distDir = '.'
    this.buildId = mockBuildId
    this.nextConfig = nextOptions.conf
    this.netlifyConfig = netlifyConfig
  }
  Object.setPrototypeOf(NetlifyNextServer, MockNetlifyNextServerConstructor)
})

describe('the netlify next server', () => {
  it('does not revalidate a request without an `x-prerender-revalidate` header', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: {} }, { ...mockTokenConfig })
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = mockRequest('/getStaticProps/with-revalidate/', {}, 'GET')
    await requestHandler(mockReq, mockRes)

    expect(mockedApiFetch).not.toHaveBeenCalled()
  })

  it('revalidates a static non-i18n route with an `x-prerender-revalidate` header', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: {} }, { ...mockTokenConfig })
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = mockRequest(
      '/non-i18n/with-revalidate/',
      { 'x-prerender-revalidate': 'test' },
      'GET',
    )
    await requestHandler(mockReq, mockRes)

    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          paths: ['/non-i18n/with-revalidate/', `/_next/data/${mockBuildId}/non-i18n/with-revalidate.json`],
        }),
      }),
    )
  })

  it('revalidates a static i18n route with an `x-prerender-revalidate` header', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: { ...mocki18nConfig } }, { ...mockTokenConfig })
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = mockRequest(
      '/i18n/with-revalidate/',
      { 'x-prerender-revalidate': 'test' },
      'GET',
    )
    await requestHandler(mockReq, mockRes)

    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          paths: ['/i18n/with-revalidate/', `/_next/data/${mockBuildId}/en/i18n/with-revalidate.json`],
        }),
      }),
    )
  })

  it('revalidates a dynamic non-i18n route with an `x-prerender-revalidate` header', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: {} }, { ...mockTokenConfig })
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

  it('revalidates a dynamic i18n route with an `x-prerender-revalidate` header', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: { ...mocki18nConfig } }, { ...mockTokenConfig })
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = mockRequest('/fr/posts/hello', { 'x-prerender-revalidate': 'test' }, 'GET')
    await requestHandler(mockReq, mockRes)

    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          paths: ['/fr/posts/hello', `/_next/data/${mockBuildId}/fr/posts/hello.json`],
        }),
      }),
    )
  })

  it('throws an error when route is not found in the manifest', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: {} }, mockTokenConfig)
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = mockRequest(
      '/not-a-valid-path/',
      { 'x-prerender-revalidate': 'test' },
      'GET',
    )

    await expect(requestHandler(mockReq, mockRes)).rejects.toThrow('not an ISR route')
  })

  it('throws an error when paths are not found by the API', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: {} }, mockTokenConfig)
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = mockRequest('/posts/hello/', { 'x-prerender-revalidate': 'test' }, 'GET')

    mockedApiFetch.mockResolvedValueOnce({ code: 500, message: 'Failed to revalidate' })
    await expect(requestHandler(mockReq, mockRes)).rejects.toThrow('Failed to revalidate')
  })

  it('throws an error when the revalidate API is unreachable', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: {} }, mockTokenConfig)
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = mockRequest('/posts/hello', { 'x-prerender-revalidate': 'test' }, 'GET')

    mockedApiFetch.mockRejectedValueOnce(new Error('Unable to connect'))
    await expect(requestHandler(mockReq, mockRes)).rejects.toThrow('Unable to connect')
  })
})
