import { NodeNextRequest, NodeNextResponse } from 'next/dist/server/base-http/node'
import { createRequestResponseMocks } from 'next/dist/server/lib/mock-request'
import { Options } from 'next/dist/server/next-server'

import { getServerFile } from '../../packages/runtime/src/helpers/files'
import { NextServerType, netlifyApiFetch } from '../../packages/runtime/src/templates/handlerUtils'
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

jest.mock(
  'server/pages-manifest.json',
  () => ({
    '/non-i18n/with-revalidate': 'pages/non-i18n/with-revalidate.js',
    '/en/i18n/with-revalidate': 'pages/en/i18n/with-revalidate.js',
    '/posts/[title]': 'pages/posts/[title].js',
  }),
  { virtual: true },
)

jest.mock(
  'routes-manifest.json',
  () => ({
    basePath: '',
    dynamicRoutes: [
      {
        page: '/posts/[title]',
        regex: '^/posts/([^/]+?)(?:/)?$',
        routeKeys: {
          nxtPtitle: 'nxtPtitle',
        },
        namedRegex: '^/posts/(?<nxtPtitle>[^/]+?)(?:/)?$',
      },
      {
        page: '/blog/[author]/[slug]',
        regex: '^/blog/([^/]+?)/([^/]+?)(?:/)?$',
        routeKeys: {
          nxtPauthor: 'nxtPauthor',
          nxtPslug: 'nxtPslug',
        },
        namedRegex: '^/blog/(?<nxtPauthor>[^/]+?)/(?<nxtPslug>[^/]+?)(?:/)?$',
      },
    ],
    staticRoutes: [
      {
        namedRegex: '^/(?:/)?$',
        page: '/',
        regex: '^/(?:/)?$',
        routeKeys: {},
      },
      {
        page: '/non-i18n/with-revalidate',
        regex: '^/non-i18n/with-revalidate(?:/)?$',
        routeKeys: {},
        namedRegex: '^/non-i18n/with-revalidate(?:/)?$',
      },
      {
        page: '/i18n/with-revalidate',
        regex: '^/i18n/with-revalidate(?:/)?$',
        routeKeys: {},
        namedRegex: '^/i18n/with-revalidate(?:/)?$',
      },
    ],
    redirects: [
      {
        basePath: false,
        destination: '/docs/',
        internal: true,
        locale: false,
        regex: '^/docs$',
        source: '/docs',
        statusCode: 308,
      },
    ],
  }),
  { virtual: true },
)

const appPathsManifest = {
  '/(group)/page': 'app/(group)/page.js',
  '/blog/(test)/[author]/[slug]/page': 'app/blog/[author]/[slug]/page.js',
}

let NetlifyNextServer: NetlifyNextServerType
beforeAll(() => {
  const NextServer: NextServerType = require(getServerFile(__dirname, false)).default
  jest.spyOn(NextServer.prototype, 'getRequestHandler').mockImplementation(() => () => Promise.resolve())
  NetlifyNextServer = getNetlifyNextServer(NextServer)

  const MockNetlifyNextServerConstructor = function (nextOptions: Options, netlifyConfig: NetlifyConfig) {
    this.distDir = '.'
    this.buildId = mockBuildId
    this.nextConfig = nextOptions.conf
    this.netlifyConfig = netlifyConfig
    this.renderOpts = { previewProps: {} }
    this.appPathsManifest = appPathsManifest
  }
  Object.setPrototypeOf(NetlifyNextServer, MockNetlifyNextServerConstructor)
})

describe('the netlify next server', () => {
  it('does not revalidate a request without an `x-prerender-revalidate` header', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: {} }, { ...mockTokenConfig })
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = createRequestResponseMocks({ url: '/getStaticProps/with-revalidate/' })
    // @ts-expect-error - Types are incorrect for `MockedResponse`
    await requestHandler(new NodeNextRequest(mockReq), new NodeNextResponse(mockRes))

    expect(mockedApiFetch).not.toHaveBeenCalled()
  })

  it('revalidates a static non-i18n route with an `x-prerender-revalidate` header', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: {} }, { ...mockTokenConfig })
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = createRequestResponseMocks({
      url: '/non-i18n/with-revalidate/',
      headers: { 'x-prerender-revalidate': 'test' },
    })
    // @ts-expect-error - Types are incorrect for `MockedResponse`
    await requestHandler(new NodeNextRequest(mockReq), new NodeNextResponse(mockRes))

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

    const { req: mockReq, res: mockRes } = createRequestResponseMocks({
      url: '/i18n/with-revalidate/',
      headers: { 'x-prerender-revalidate': 'test' },
    })
    // @ts-expect-error - Types are incorrect for `MockedResponse`
    await requestHandler(new NodeNextRequest(mockReq), new NodeNextResponse(mockRes))

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

    const { req: mockReq, res: mockRes } = createRequestResponseMocks({
      url: '/blog/rob/hello',
      headers: { 'x-prerender-revalidate': 'test' },
    })
    // @ts-expect-error - Types are incorrect for `MockedResponse`
    await requestHandler(new NodeNextRequest(mockReq), new NodeNextResponse(mockRes))

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

    const { req: mockReq, res: mockRes } = createRequestResponseMocks({
      url: '/fr/posts/hello',
      headers: { 'x-prerender-revalidate': 'test' },
    })
    // @ts-expect-error - Types are incorrect for `MockedResponse`
    await requestHandler(new NodeNextRequest(mockReq), new NodeNextResponse(mockRes))

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

    const { req: mockReq, res: mockRes } = createRequestResponseMocks({
      url: '/not-a-valid-path/',
      headers: { 'x-prerender-revalidate': 'test' },
    })

    // @ts-expect-error - Types are incorrect for `MockedResponse`
    await expect(requestHandler(new NodeNextRequest(mockReq), new NodeNextResponse(mockRes))).rejects.toThrow(
      'not an ISR route',
    )
  })

  it('throws an error when paths are not found by the API', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: {} }, mockTokenConfig)
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = createRequestResponseMocks({
      url: '/posts/hello/',
      headers: { 'x-prerender-revalidate': 'test' },
    })

    mockedApiFetch.mockResolvedValueOnce({ code: 500, message: 'Failed to revalidate' })
    // @ts-expect-error - Types are incorrect for `MockedResponse`
    await expect(requestHandler(new NodeNextRequest(mockReq), new NodeNextResponse(mockRes))).rejects.toThrow(
      'Failed to revalidate',
    )
  })

  it('throws an error when the revalidate API is unreachable', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: {} }, mockTokenConfig)
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = createRequestResponseMocks({
      url: '/posts/hello',
      headers: { 'x-prerender-revalidate': 'test' },
    })

    mockedApiFetch.mockRejectedValueOnce(new Error('Unable to connect'))
    // @ts-expect-error - Types are incorrect for `MockedResponse`
    await expect(requestHandler(new NodeNextRequest(mockReq), new NodeNextResponse(mockRes))).rejects.toThrow(
      'Unable to connect',
    )
  })

  it('resolves react as normal for pages routes', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: {} }, {})
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = createRequestResponseMocks({
      url: '/posts/hello',
    })

    // @ts-expect-error - Types are incorrect for `MockedResponse`
    await requestHandler(new NodeNextRequest(mockReq), new NodeNextResponse(mockRes))

    // eslint-disable-next-line no-underscore-dangle
    expect(process.env.__NEXT_PRIVATE_PREBUNDLED_REACT).toBe('')
  })

  it('resolves the prebundled react version for app routes', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: { experimental: { appDir: true } } }, {})
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = createRequestResponseMocks({
      url: '/blog/rob/hello',
    })

    // @ts-expect-error - Types are incorrect for `MockedResponse`
    await requestHandler(new NodeNextRequest(mockReq), new NodeNextResponse(mockRes))

    // eslint-disable-next-line no-underscore-dangle
    expect(process.env.__NEXT_PRIVATE_PREBUNDLED_REACT).toBe('next')
  })

  it('resolves the experimental prebundled react version for app routes with server actions', async () => {
    const netlifyNextServer = new NetlifyNextServer(
      { conf: { experimental: { appDir: true, serverActions: true } } },
      {},
    )
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = createRequestResponseMocks({
      url: '/blog/rob/hello',
    })

    // @ts-expect-error - Types are incorrect for `MockedResponse`
    await requestHandler(new NodeNextRequest(mockReq), new NodeNextResponse(mockRes))

    // eslint-disable-next-line no-underscore-dangle
    expect(process.env.__NEXT_PRIVATE_PREBUNDLED_REACT).toBe('experimental')
  })

  it('assigns correct prebundled react with basePath config using appdir', async () => {
    const netlifyNextServer = new NetlifyNextServer({ conf: { experimental: { appDir: true }, basePath: '/docs' } }, {})
    const requestHandler = netlifyNextServer.getRequestHandler()

    const { req: mockReq, res: mockRes } = createRequestResponseMocks({
      url: '/docs',
    })

    // @ts-expect-error - Types are incorrect for `MockedResponse`
    await requestHandler(new NodeNextRequest(mockReq), new NodeNextResponse(mockRes))

    // eslint-disable-next-line no-underscore-dangle
    expect(process.env.__NEXT_PRIVATE_PREBUNDLED_REACT).toBe('next')
  })
})
