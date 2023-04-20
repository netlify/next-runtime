import { getApiRouteConfigs, getExtendedApiRouteConfigs } from '../../packages/runtime/src/helpers/functions'
import { describeCwdTmpDir, moveNextDist } from '../test-utils'

describeCwdTmpDir('api route file analysis', () => {
  it('extracts correct route configs from source files', async () => {
    await moveNextDist()
    const configs = await getApiRouteConfigs('.next', process.cwd())
    // Using a Set means the order doesn't matter
    expect(new Set(configs)).toEqual(
      new Set([
        {
          compiled: 'pages/api/og.js',
          config: {
            runtime: 'edge',
          },
          route: '/api/og',
        },
        {
          compiled: 'pages/api/enterPreview.js',
          config: {},
          route: '/api/enterPreview',
        },
        {
          compiled: 'pages/api/exitPreview.js',
          config: {},
          route: '/api/exitPreview',
        },
        {
          compiled: 'pages/api/hello.js',
          config: {},
          route: '/api/hello',
        },
        {
          compiled: 'pages/api/shows/[...params].js',
          config: {},
          route: '/api/shows/[...params]',
        },
        {
          compiled: 'pages/api/shows/[id].js',
          config: {},
          route: '/api/shows/[id]',
        },
        {
          compiled: 'pages/api/hello-background.js',
          config: { type: 'experimental-background' },
          route: '/api/hello-background',
        },
        {
          compiled: 'pages/api/hello-scheduled.js',
          config: { schedule: '@hourly', type: 'experimental-scheduled' },
          route: '/api/hello-scheduled',
        },
        {
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
    expect(new Set(configs)).toEqual(
      new Set([
        {
          compiled: 'pages/api/hello-background.js',
          config: { type: 'experimental-background' },
          route: '/api/hello-background',
        },
        {
          compiled: 'pages/api/hello-scheduled.js',
          config: { schedule: '@hourly', type: 'experimental-scheduled' },
          route: '/api/hello-scheduled',
        },
      ]),
    )
  })
})
