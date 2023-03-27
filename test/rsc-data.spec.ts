import { getRscDataRouter, PrerenderManifest } from '../packages/runtime/src/templates/edge-shared/rsc-data'

const basePrerenderManifest: PrerenderManifest = {
  version: 3,
  routes: {},
  dynamicRoutes: {},
  notFoundRoutes: [],
}

describe('getRscDataRouter', () => {
  it('should create a RSC data router when data routes are not present for routes', () => {
    const manifest: PrerenderManifest = {
      ...basePrerenderManifest,
      routes: {
        '/': {
          initialRevalidateSeconds: 1,
          srcRoute: null,
          dataRoute: '/index.json.rsc',
        },
        '/api/hello': {
          initialRevalidateSeconds: false,
          srcRoute: '/api/hello',
          dataRoute: null,
        },
      },
    }

    let rscDataRouter

    expect(() => {
      rscDataRouter = getRscDataRouter(manifest)
    }).not.toThrow()

    expect(typeof rscDataRouter).toBe('function')
  })
})
