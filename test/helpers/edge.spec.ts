import { generateRscDataEdgeManifest } from '../../packages/runtime/src/helpers/edge'
import type { PrerenderManifest } from 'next/dist/build'

jest.mock('../packages/runtime/src/helpers/functionsMetaData', () => {
  const { NEXT_PLUGIN_NAME } = require('../packages/runtime/src/constants')
  return {
    ...jest.requireActual('../packages/runtime/src/helpers/functionsMetaData'),
    getPluginVersion: async () => `${NEXT_PLUGIN_NAME}@1.0.0`,
  }
})

const basePrerenderManifest: PrerenderManifest = {
  version: 3,
  routes: {},
  dynamicRoutes: {},
  notFoundRoutes: [],
  preview: {
    previewModeId: '',
    previewModeSigningKey: '',
    previewModeEncryptionKey: '',
  },
}

describe('generateRscDataEdgeManifest', () => {
  it('should return manifest entries for static appDir routes', async () => {
    const prerenderManifest: PrerenderManifest = {
      ...basePrerenderManifest,
      routes: {
        '/': {
          initialRevalidateSeconds: false,
          srcRoute: '/',
          dataRoute: '/index.rsc',
        },
      },
    }
    const appPathRoutesManifest = {
      '/page': '/',
    }
    const edgeManifest = await generateRscDataEdgeManifest({ prerenderManifest, appPathRoutesManifest })

    expect(edgeManifest).toEqual([
      {
        function: 'rsc-data',
        generator: "@netlify/next-runtime@1.0.0",
        name: 'RSC data routing',
        path: '/',
      },
      {
        function: 'rsc-data',
        generator: "@netlify/next-runtime@1.0.0",
        name: 'RSC data routing',
        path: '/index.rsc',
      },
    ])
  })

  it('should not return manifest entries for static appDir routes without dataRoutes', async () => {
    const prerenderManifest: PrerenderManifest = {
      ...basePrerenderManifest,
      routes: {
        '/api/hello': {
          initialRevalidateSeconds: false,
          srcRoute: '/api/hello',
          dataRoute: null,
        },
      },
    }
    const appPathRoutesManifest = {
      '/api/hello/route': '/api/hello',
    }
    const edgeManifest = await generateRscDataEdgeManifest({ prerenderManifest, appPathRoutesManifest })

    expect(edgeManifest).toEqual([])
  })

  it('should return manifest entries for dynamic appDir routes', async () => {
    const prerenderManifest: PrerenderManifest = {
      ...basePrerenderManifest,
      dynamicRoutes: {
        '/blog/[author]': {
          routeRegex: '^/blog/([^/]+?)(?:/)?$',
          dataRoute: '/blog/[author].rsc',
          fallback: null,
          dataRouteRegex: '^/blog/([^/]+?)\\.rsc$',
        },
      },
    }

    const appPathRoutesManifest = {
      '/blog/[author]/page': '/blog/[author]',
    }
    const edgeManifest = await generateRscDataEdgeManifest({ prerenderManifest, appPathRoutesManifest })

    expect(edgeManifest).toEqual([
      {
        function: 'rsc-data',
        generator: "@netlify/next-runtime@1.0.0",
        name: 'RSC data routing',
        pattern: '^/blog/([^/]+?)(?:/)?$',
      },
      {
        function: 'rsc-data',
        generator: "@netlify/next-runtime@1.0.0",
        name: 'RSC data routing',
        pattern: '^/blog/([^/]+?)\\.rsc$',
      },
    ])
  })

  it('should not return manifest entries for dynamic appDir routes without dataRouteRegex', async () => {
    const prerenderManifest: PrerenderManifest = {
      ...basePrerenderManifest,
      dynamicRoutes: {
        '/api/[endpoint]': {
          routeRegex: '^/api/([^/]+?)(?:/)?$',
          dataRoute: '/api/[endpoint].rsc',
          fallback: null,
          dataRouteRegex: null,
        },
      },
    }

    const appPathRoutesManifest = {
      '/api/[endpoint]/route': '/api/[endpoint]',
    }
    const edgeManifest = await generateRscDataEdgeManifest({ prerenderManifest, appPathRoutesManifest })

    expect(edgeManifest).toEqual([])
  })
})
