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

    // Normally type checking would pick this up, but because this file is copied when generating
    // edge functions for the build, we need to make sure it's valid for builds.
    //
    // See https://github.com/netlify/next-runtime/issues/1940
    expect(() => {
      rscDataRouter = getRscDataRouter(manifest)
    }).not.toThrow()

    expect(typeof rscDataRouter).toBe('function')
  })
})