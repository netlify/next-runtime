import { getExtendedApiRouteConfigs } from "../../packages/runtime/src/helpers/functions"
import { moveNextDist } from "../test-utils"

describe('api route file analysis', () => {
  it('extracts correct route configs from source files', async () => {
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