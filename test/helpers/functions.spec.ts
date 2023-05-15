import { getApiRouteConfigs, getExtendedApiRouteConfigs } from '../../packages/runtime/src/helpers/functions'
import { describeCwdTmpDir, moveNextDist } from '../test-utils'

describeCwdTmpDir('api route file analysis', () => {
  it('extracts correct route configs from source files', async () => {
    await moveNextDist()
    const configs = await getApiRouteConfigs('.next', process.cwd(), ['js', 'jsx', 'ts', 'tsx'])
    // Using a Set means the order doesn't matter
    expect(new Set(configs.map(({ includedFiles, ...rest }) => rest))).toEqual(
      new Set([
        {
          functionName: '_api_og-handler',
          compiled: 'pages/api/og.js',
          config: {
            runtime: 'edge',
          },
          route: '/api/og',
        },
        {
          functionName: '_api_enterPreview-handler',
          compiled: 'pages/api/enterPreview.js',
          config: {},
          route: '/api/enterPreview',
        },
        {
          functionName: '_api_exitPreview-handler',
          compiled: 'pages/api/exitPreview.js',
          config: {},
          route: '/api/exitPreview',
        },
        {
          functionName: '_api_hello-handler',
          compiled: 'pages/api/hello.js',
          config: {},
          route: '/api/hello',
        },
        {
          functionName: '_api_shows_params-SPLAT-handler',
          compiled: 'pages/api/shows/[...params].js',
          config: {},
          route: '/api/shows/[...params]',
        },
        {
          functionName: '_api_shows_id-PARAM-handler',
          compiled: 'pages/api/shows/[id].js',
          config: {},
          route: '/api/shows/[id]',
        },
        {
          functionName: '_api_hello-background-background',
          compiled: 'pages/api/hello-background.js',
          config: { type: 'experimental-background' },
          route: '/api/hello-background',
        },
        {
          functionName: '_api_hello-scheduled-handler',
          compiled: 'pages/api/hello-scheduled.js',
          config: { schedule: '@hourly', type: 'experimental-scheduled' },
          route: '/api/hello-scheduled',
        },
        {
          functionName: '_api_revalidate-handler',
          compiled: 'pages/api/revalidate.js',
          config: {},
          route: '/api/revalidate',
        },
      ]),
    )
  })

  it('only shows scheduled/background functions as extended funcs', async () => {
    await moveNextDist()
    const configs = await getExtendedApiRouteConfigs('.next', process.cwd())
    // Using a Set means the order doesn't matter
    expect(new Set(configs.map(({ includedFiles, ...rest }) => rest))).toEqual(
      new Set([
        {
          functionName: '_api_hello-background-background',
          compiled: 'pages/api/hello-background.js',
          config: { type: 'experimental-background' },
          route: '/api/hello-background',
        },
        {
          functionName: '_api_hello-scheduled-handler',
          compiled: 'pages/api/hello-scheduled.js',
          config: { schedule: '@hourly', type: 'experimental-scheduled' },
          route: '/api/hello-scheduled',
        },
      ]),
    )
  })
})
