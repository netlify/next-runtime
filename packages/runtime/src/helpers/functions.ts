import { cpus } from 'os'

import type { NetlifyConfig, NetlifyPluginConstants } from '@netlify/build'
import bridgeFile from '@vercel/node-bridge'
import chalk from 'chalk'
import destr from 'destr'
import { copyFile, ensureDir, existsSync, readJSON, writeFile, writeJSON, stat, readFile } from 'fs-extra'
import type { PrerenderManifest } from 'next/dist/build'
import type { ImageConfigComplete, RemotePattern } from 'next/dist/shared/lib/image-config'
import { outdent } from 'outdent'
import pLimit from 'p-limit'
import { join, relative, resolve, dirname, basename, extname } from 'pathe'
import glob from 'tiny-glob'

import {
  HANDLER_FUNCTION_NAME,
  ODB_FUNCTION_NAME,
  IMAGE_FUNCTION_NAME,
  DEFAULT_FUNCTIONS_SRC,
  HANDLER_FUNCTION_TITLE,
  ODB_FUNCTION_TITLE,
  IMAGE_FUNCTION_TITLE,
  API_FUNCTION_TITLE,
  API_FUNCTION_NAME,
  LAMBDA_WARNING_SIZE,
} from '../constants'
import { getApiHandler } from '../templates/getApiHandler'
import { getHandler } from '../templates/getHandler'
import { getResolverForPages, getResolverForSourceFiles } from '../templates/getPageResolver'

import { ApiConfig, extractConfigFromFile, isEdgeConfig } from './analysis'
import { getBlobStorage } from './blobStorage'
import { getRequiredServerFiles } from './config'
import { getDependenciesOfFile, getServerFile, getSourceFileForPage } from './files'
import { writeFunctionConfiguration } from './functionsMetaData'
import { pack } from './pack'
import { ApiRouteType } from './types'
import { getFunctionNameForPage } from './utils'

type Blobs = Awaited<ReturnType<typeof getBlobStorage>>

export interface RouteConfig {
  functionName: string
  functionTitle?: string
  route: string
  compiled: string
  includedFiles: string[]
}

export interface ApiRouteConfig extends RouteConfig {
  config: ApiConfig
}

export interface SSRLambda {
  functionName: string
  functionTitle: string
  routes: RouteConfig[]
  includedFiles: string[]
}

export interface APILambda extends SSRLambda {
  routes: ApiRouteConfig[]
  type?: ApiRouteType
}

export const generateFunctions = async (
  {
    INTERNAL_FUNCTIONS_SRC,
    PUBLISH_DIR,
    PACKAGE_PATH = '',
    FUNCTIONS_SRC = join(PACKAGE_PATH, DEFAULT_FUNCTIONS_SRC),
  }: NetlifyPluginConstants,
  appDir: string,
  apiLambdas: APILambda[],
  ssrLambdas: SSRLambda[],
): Promise<void> => {
  const publish = resolve(PUBLISH_DIR)
  const functionsDir = resolve(INTERNAL_FUNCTIONS_SRC || FUNCTIONS_SRC)
  const functionDir = join(functionsDir, HANDLER_FUNCTION_NAME)
  const publishDir = relative(functionDir, publish)

  const nextServerModuleAbsoluteLocation = getServerFile(appDir, false)
  const nextServerModuleRelativeLocation = nextServerModuleAbsoluteLocation
    ? relative(functionDir, nextServerModuleAbsoluteLocation)
    : undefined

  for (const apiLambda of apiLambdas) {
    const { functionName, functionTitle, routes, type, includedFiles } = apiLambda

    const apiHandlerSource = getApiHandler({
      // most api lambdas serve multiple routes, but scheduled functions need to be in separate lambdas.
      // so routes[0] is safe to access.
      schedule: type === ApiRouteType.SCHEDULED ? routes[0].config.schedule : undefined,
      publishDir,
      appDir: relative(functionDir, appDir),
      nextServerModuleRelativeLocation,
    })

    await ensureDir(join(functionsDir, functionName))

    // write main API handler file
    await writeFile(join(functionsDir, functionName, `${functionName}.js`), apiHandlerSource)

    // copy handler dependencies (VercelNodeBridge, NetlifyNextServer, etc.)
    await copyFile(bridgeFile, join(functionsDir, functionName, 'bridge.js'))
    await copyFile(
      join(__dirname, '..', '..', 'lib', 'templates', 'server.js'),
      join(functionsDir, functionName, 'server.js'),
    )
    await copyFile(
      join(__dirname, '..', '..', 'lib', 'templates', 'requireHooks.js'),
      join(functionsDir, functionName, 'requireHooks.js'),
    )
    await copyFile(
      join(__dirname, '..', '..', 'lib', 'templates', 'handlerUtils.js'),
      join(functionsDir, functionName, 'handlerUtils.js'),
    )

    const resolveSourceFile = (file: string) => join(publish, 'server', file)

    // TODO: this should be unneeded once we use the `none` bundler everywhere
    const resolverSource = await getResolverForSourceFiles({
      functionsDir,
      // These extra pages are always included by Next.js
      sourceFiles: [
        ...routes.map((route) => route.compiled),
        'pages/_app.js',
        'pages/_document.js',
        'pages/_error.js',
      ].map(resolveSourceFile),
    })
    await writeFile(join(functionsDir, functionName, 'pages.js'), resolverSource)

    await writeFunctionConfiguration({ functionName, functionTitle, functionsDir })

    const nfInternalFiles = await glob(join(functionsDir, functionName, '**'))
    includedFiles.push(...nfInternalFiles)
  }

  const writeHandler = async (functionName: string, functionTitle: string, isODB: boolean) => {
    const handlerSource = getHandler({
      isODB,
      publishDir,
      appDir: relative(functionDir, appDir),
      nextServerModuleRelativeLocation,
    })
    await ensureDir(join(functionsDir, functionName))

    // write main handler file (standard or ODB)
    await writeFile(join(functionsDir, functionName, `${functionName}.js`), handlerSource)

    // copy handler dependencies (VercelNodeBridge, NetlifyNextServer, etc.)
    await copyFile(bridgeFile, join(functionsDir, functionName, 'bridge.js'))
    await copyFile(
      join(__dirname, '..', '..', 'lib', 'templates', 'server.js'),
      join(functionsDir, functionName, 'server.js'),
    )
    await copyFile(
      join(__dirname, '..', '..', 'lib', 'templates', 'requireHooks.js'),
      join(functionsDir, functionName, 'requireHooks.js'),
    )
    await copyFile(
      join(__dirname, '..', '..', 'lib', 'templates', 'handlerUtils.js'),
      join(functionsDir, functionName, 'handlerUtils.js'),
    )
    await writeFunctionConfiguration({ functionName, functionTitle, functionsDir })

    const nfInternalFiles = await glob(join(functionsDir, functionName, '**'))
    const lambda = ssrLambdas.find((l) => l.functionName === functionName)
    if (lambda) {
      lambda.includedFiles.push(...nfInternalFiles)
    }
  }

  await writeHandler(HANDLER_FUNCTION_NAME, HANDLER_FUNCTION_TITLE, false)
  await writeHandler(ODB_FUNCTION_NAME, ODB_FUNCTION_TITLE, true)
}

/**
 * Writes a file in each function directory that contains references to every page entrypoint.
 * This is just so that the nft bundler knows about them. We'll eventually do this better.
 */
export const generatePagesResolver = async ({
  INTERNAL_FUNCTIONS_SRC,
  PUBLISH_DIR,
  PACKAGE_PATH = '',
  FUNCTIONS_SRC = join(PACKAGE_PATH, DEFAULT_FUNCTIONS_SRC),
}: NetlifyPluginConstants): Promise<void> => {
  const functionsPath = INTERNAL_FUNCTIONS_SRC || FUNCTIONS_SRC

  const jsSource = await getResolverForPages(PUBLISH_DIR, PACKAGE_PATH)

  await writeFile(join(functionsPath, ODB_FUNCTION_NAME, 'pages.js'), jsSource)
  await writeFile(join(functionsPath, HANDLER_FUNCTION_NAME, 'pages.js'), jsSource)
}

// Move our next/image function into the correct functions directory
export const setupImageFunction = async ({
  constants: {
    IS_LOCAL,
    INTERNAL_FUNCTIONS_SRC,
    PACKAGE_PATH = '',
    FUNCTIONS_SRC = join(PACKAGE_PATH, DEFAULT_FUNCTIONS_SRC),
  },
  imageconfig = {},
  netlifyConfig,
  basePath,
  remotePatterns,
  responseHeaders,
}: {
  constants: NetlifyPluginConstants
  netlifyConfig: NetlifyConfig
  basePath: string
  imageconfig: Partial<ImageConfigComplete>
  remotePatterns: RemotePattern[]
  responseHeaders?: Record<string, string>
}): Promise<void> => {
  const imagePath = imageconfig.path || '/_next/image'

  if (destr(process.env.DISABLE_IPX)) {
    // If no image loader is specified, need to redirect to a 404 page since there's no
    // backing loader to serve local site images once deployed to Netlify
    if (!IS_LOCAL && imageconfig.loader === 'default') {
      netlifyConfig.redirects.push({
        from: `${imagePath}*`,
        query: { url: ':url', w: ':width', q: ':quality' },
        to: '/404.html',
        status: 404,
        force: true,
      })
    }
  } else {
    const functionsPath = INTERNAL_FUNCTIONS_SRC || FUNCTIONS_SRC
    const functionName = `${IMAGE_FUNCTION_NAME}.js`
    const functionDirectory = join(functionsPath, IMAGE_FUNCTION_NAME)

    await ensureDir(functionDirectory)
    await writeJSON(join(functionDirectory, 'imageconfig.json'), {
      ...imageconfig,
      basePath: [basePath, IMAGE_FUNCTION_NAME].join('/'),
      remotePatterns,
      responseHeaders,
    })

    await copyFile(join(__dirname, '..', '..', 'lib', 'templates', 'ipx.js'), join(functionDirectory, functionName))
    writeFunctionConfiguration({
      functionName: IMAGE_FUNCTION_NAME,
      functionTitle: IMAGE_FUNCTION_TITLE,
      functionsDir: functionsPath,
    })

    // If we have edge functions then the request will have already been rewritten
    // so this won't match. This is matched if edge is disabled or unavailable.
    netlifyConfig.redirects.push({
      from: `${imagePath}*`,
      query: { url: ':url', w: ':width', q: ':quality' },
      to: `${basePath}/${IMAGE_FUNCTION_NAME}/w_:width,q_:quality/:url`,
      status: 301,
    })

    netlifyConfig.redirects.push({
      from: `${basePath}/${IMAGE_FUNCTION_NAME}/*`,
      to: `/.netlify/builders/${IMAGE_FUNCTION_NAME}`,
      status: 200,
    })
  }

  if (basePath) {
    // next/image generates image static URLs that still point at the site root
    netlifyConfig.redirects.push({
      from: '/_next/static/image/*',
      to: '/static/image/:splat',
      status: 200,
    })
  }
}

const traceRequiredServerFiles = async (publish: string): Promise<string[]> => {
  const requiredServerFiles = await getRequiredServerFiles(publish)

  let appDirRoot = requiredServerFiles.appDir ?? join(publish, '..')
  if (requiredServerFiles.relativeAppDir && requiredServerFiles.config?.experimental.outputFileTracingRoot) {
    appDirRoot = join(requiredServerFiles.config.experimental.outputFileTracingRoot, requiredServerFiles.relativeAppDir)
  }

  const files = requiredServerFiles.files ?? []
  const absoluteFiles = files.map((file) => join(appDirRoot, file))

  absoluteFiles.push(join(publish, 'required-server-files.json'))

  return absoluteFiles
}

const traceNextServer = async (publish: string): Promise<string[]> => {
  const nextServerDeps = await getDependenciesOfFile(join(publish, 'next-server.js'))

  // during testing, i've seen `next-server` contain only one line.
  // this is a sanity check to make sure we're getting all the deps.
  if (nextServerDeps.length < 10) {
    console.error(nextServerDeps)
    throw new Error("next-server.js.nft.json didn't contain all dependencies.")
  }

  const filtered = nextServerDeps.filter((f) => {
    // NFT detects a bunch of large development files that we don't need.
    if (f.endsWith('.development.js')) return false

    // not needed for API Routes!
    if (f.endsWith('node_modules/sass/sass.dart.js')) return false

    return true
  })

  return filtered
}

export const traceNPMPackage = async (packageName: string, publish: string) => {
  try {
    return await glob(join(dirname(require.resolve(packageName, { paths: [__dirname, publish] })), '**', '*'), {
      absolute: true,
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'test') {
      return []
    }
    throw error
  }
}

export const getCommonDependencies = async (publish: string) => {
  const deps = await Promise.all([
    traceRequiredServerFiles(publish),
    traceNextServer(publish),

    // used by our own bridge.js
    traceNPMPackage('follow-redirects', publish),

    // using package.json because otherwise, we'd find some /dist/... path
    traceNPMPackage('@netlify/functions/package.json', publish),
    traceNPMPackage('is-promise', publish),
  ])

  return deps.flat(1)
}

const sum = (arr: number[]) => arr.reduce((v, current) => v + current, 0)

// TODO: cache results
const getBundleWeight = async (patterns: string[]) => {
  const sizes = await Promise.all(
    patterns.flatMap(async (pattern) => {
      const files = await glob(pattern)
      return Promise.all(
        files.map(async (file) => {
          const fStat = await stat(file)
          if (fStat.isFile()) {
            return fStat.size
          }
          return 0
        }),
      )
    }),
  )

  return sum(sizes.flat(1))
}

const changeExtension = (file: string, extension: string) => {
  const base = basename(file, extname(file))
  return join(dirname(file), base + extension)
}

const getPrerenderManifest = async (publish: string) => {
  const prerenderManifest: PrerenderManifest = await readJSON(join(publish, 'prerender-manifest.json'))

  return prerenderManifest
}

/**
 * Warms up the cache with prerendered content
 *
 * @param options
 * @param options.netliBlob - the blob storage instance
 * @param options.prerenderManifest - the prerender manifest
 * @param options.publish - the publish directory
 *
 */
const setPrerenderedBlobStoreContent = async ({
  netliBlob,
  prerenderManifest,
  publish,
}: {
  netliBlob: Blobs
  prerenderManifest: PrerenderManifest
  publish: string
}): Promise<void> => {
  const limit = pLimit(Math.max(2, cpus().length))

  const blobCalls = Object.entries(prerenderManifest.routes).map(([route, ssgRoute]) =>
    limit(async () => {
      const routerTypeSubPath = ssgRoute.dataRoute.endsWith('.rsc') ? 'app' : 'pages'
      const dataFilePath = join(publish, 'server', routerTypeSubPath, ssgRoute.dataRoute)
      const pageData =
        routerTypeSubPath === 'app'
          ? await readFile(dataFilePath, 'utf8')
          : JSON.parse(await readFile(join(publish, 'server', routerTypeSubPath, `${route}.json`), 'utf8'))

      const htmlFilePath = join(publish, 'server', routerTypeSubPath, `${route}.html`)
      const html = await readFile(htmlFilePath, 'utf8')
      const data = {
        value: {
          kind: 'PAGE' as const,
          html,
          pageData,
        },
        lastModified: Date.now(),
      }

      return netliBlob.setJSON(route.slice(1), data)
    }),
  )

  await Promise.all(blobCalls)
}

const getPrerenderedContent = (prerenderManifest: PrerenderManifest, publish: string): string[] => [
  ...Object.entries(prerenderManifest.routes).flatMap(([route, ssgRoute]) => {
    if (ssgRoute.initialRevalidateSeconds === false) {
      return []
    }

    if (ssgRoute.dataRoute.endsWith('.rsc')) {
      return [
        join(publish, 'server', 'app', ssgRoute.dataRoute),
        join(publish, 'server', 'app', changeExtension(ssgRoute.dataRoute, '.html')),
      ]
    }

    const trimmedPath = route === '/' ? 'index' : route.slice(1)
    return [
      join(publish, 'server', 'pages', `${trimmedPath}.html`),
      join(publish, 'server', 'pages', `${trimmedPath}.json`),
    ]
  }),
  join(publish, '**', '*.html'),
  join(publish, 'static-manifest.json'),
]

type EnhancedNetlifyPluginConstants = NetlifyPluginConstants & {
  NETLIFY_API_HOST?: string
  NETLIFY_API_TOKEN?: string
}

// TODO: get a build feature flag set up for blob storage
export const getSSRLambdas = async ({
  publish,
  constants,
  featureFlags,
}: {
  publish: string
  constants: EnhancedNetlifyPluginConstants
  featureFlags: Record<string, unknown>
}): Promise<SSRLambda[]> => {
  console.dir(featureFlags)
  const commonDependencies = await getCommonDependencies(publish)
  const ssrRoutes = await getSSRRoutes(publish)

  // TODO: for now, they're the same - but we should separate them
  const nonOdbRoutes = ssrRoutes
  const odbRoutes = ssrRoutes
  const { NETLIFY_API_HOST, NETLIFY_API_TOKEN, SITE_ID } = constants

  // This check could be improved via featureFlags exposed in the build for blob storage
  const isUsingBlobStorage =
    NETLIFY_API_TOKEN !== undefined && process.env.DEPLOY_ID !== '0' && process.env.DEPLOY_ID !== undefined

  const prerenderManifest = await getPrerenderManifest(publish)
  let ssrDependencies: Awaited<ReturnType<typeof getPrerenderedContent>>

  if (isUsingBlobStorage) {
    ssrDependencies = []
    const netliBlob = await getBlobStorage({
      apiHost: NETLIFY_API_HOST,
      token: NETLIFY_API_TOKEN,
      siteID: SITE_ID,
      deployId: process.env.DEPLOY_ID,
    })

    try {
      console.log('warming up the cache with prerendered content')
      await setPrerenderedBlobStoreContent({ netliBlob, prerenderManifest, publish })
    } catch (error) {
      console.error('Unable to store prerendered content in blob storage', error)

      throw error
    }
  } else {
    // We only want prerendered content stored in the lambda if we aren't using blob srorage
    ssrDependencies = getPrerenderedContent(prerenderManifest, publish)
  }

  return [
    {
      functionName: HANDLER_FUNCTION_NAME,
      functionTitle: HANDLER_FUNCTION_TITLE,
      includedFiles: [
        ...commonDependencies,
        ...ssrDependencies,
        ...nonOdbRoutes.flatMap((route) => route.includedFiles),
      ],
      routes: nonOdbRoutes,
    },
    {
      functionName: ODB_FUNCTION_NAME,
      functionTitle: ODB_FUNCTION_TITLE,
      includedFiles: [...commonDependencies, ...ssrDependencies, ...odbRoutes.flatMap((route) => route.includedFiles)],
      routes: odbRoutes,
    },
  ]
}

const getSSRRoutes = async (publish: string): Promise<RouteConfig[]> => {
  const pageManifest = (await readJSON(join(publish, 'server', 'pages-manifest.json'))) as Record<string, string>
  const pageManifestRoutes = Object.entries(pageManifest).filter(
    ([page, compiled]) => !page.startsWith('/api/') && !compiled.endsWith('.html'),
  )

  const appPathsManifest: Record<string, string> = await readJSON(
    join(publish, 'server', 'app-paths-manifest.json'),
  ).catch(() => ({}))
  const appRoutes = Object.entries(appPathsManifest)

  const routes = [...pageManifestRoutes, ...appRoutes]

  return await Promise.all(
    routes.map(async ([route, compiled]) => {
      const functionName = getFunctionNameForPage(route)

      const compiledPath = join(publish, 'server', compiled)

      const routeDependencies = await getDependenciesOfFile(compiledPath)
      const includedFiles = [compiledPath, ...routeDependencies]

      return {
        functionName,
        route,
        compiled,
        includedFiles,
      }
    }),
  )
}

export const getAPILambdas = async (
  publish: string,
  baseDir: string,
  pageExtensions: string[],
): Promise<APILambda[]> => {
  const commonDependencies = await getCommonDependencies(publish)

  const threshold = LAMBDA_WARNING_SIZE - (await getBundleWeight(commonDependencies))

  const apiRoutes = await getApiRouteConfigs(publish, baseDir, pageExtensions)

  const packFunctions = async (routes: ApiRouteConfig[], type?: ApiRouteType): Promise<APILambda[]> => {
    const weighedRoutes = await Promise.all(
      routes.map(async (route) => ({ value: route, weight: await getBundleWeight(route.includedFiles) })),
    )

    const bins = pack(weighedRoutes, threshold)

    return bins.map((bin) => {
      if (bin.length === 1) {
        const [func] = bin
        const { functionName, functionTitle, config, includedFiles } = func
        return {
          functionName,
          functionTitle,
          routes: [func],
          includedFiles: [...commonDependencies, ...includedFiles],
          type: config.type,
        }
      }

      const includedFiles = [...commonDependencies, ...bin.flatMap((route) => route.includedFiles)]
      const nonSingletonBins = bins.filter((b) => b.length > 1)
      if (nonSingletonBins.length === 1) {
        return {
          functionName: API_FUNCTION_NAME,
          functionTitle: API_FUNCTION_TITLE,
          includedFiles,
          routes: bin,
          type,
        }
      }

      const indexInNonSingletonBins = nonSingletonBins.indexOf(bin)

      return {
        functionName: `${API_FUNCTION_NAME}-${indexInNonSingletonBins + 1}`,
        functionTitle: `${API_FUNCTION_TITLE} ${indexInNonSingletonBins + 1}/${nonSingletonBins.length}`,
        includedFiles,
        routes: bin,
        type,
      }
    })
  }

  const standardFunctions = apiRoutes.filter(
    (route) =>
      !isEdgeConfig(route.config.runtime) &&
      route.config.type !== ApiRouteType.BACKGROUND &&
      route.config.type !== ApiRouteType.SCHEDULED,
  )
  const scheduledFunctions = apiRoutes.filter((route) => route.config.type === ApiRouteType.SCHEDULED)
  const backgroundFunctions = apiRoutes.filter((route) => route.config.type === ApiRouteType.BACKGROUND)

  const scheduledLambdas: APILambda[] = scheduledFunctions.map(packSingleFunction)

  const [standardLambdas, backgroundLambdas] = await Promise.all([
    packFunctions(standardFunctions),
    packFunctions(backgroundFunctions, ApiRouteType.BACKGROUND),
  ])
  return [...standardLambdas, ...backgroundLambdas, ...scheduledLambdas]
}

/**
 * Look for API routes, and extract the config from the source file.
 */
export const getApiRouteConfigs = async (
  publish: string,
  appDir: string,
  pageExtensions?: string[],
): Promise<Array<ApiRouteConfig>> => {
  const pages = await readJSON(join(publish, 'server', 'pages-manifest.json'))
  const apiRoutes = Object.keys(pages).filter((page) => page.startsWith('/api/'))
  // two possible places
  // Ref: https://nextjs.org/docs/advanced-features/src-directory
  const pagesDir = join(appDir, 'pages')
  const srcPagesDir = join(appDir, 'src', 'pages')

  return await Promise.all(
    apiRoutes.map(async (apiRoute) => {
      const filePath = getSourceFileForPage(apiRoute, [pagesDir, srcPagesDir], pageExtensions)
      const config = await extractConfigFromFile(filePath, appDir)

      const functionName = getFunctionNameForPage(apiRoute, config.type === ApiRouteType.BACKGROUND)
      const functionTitle = `${API_FUNCTION_TITLE} ${apiRoute}`

      const compiled = pages[apiRoute]
      const compiledPath = join(publish, 'server', compiled)

      const routeDependencies = await getDependenciesOfFile(compiledPath)
      const includedFiles = [compiledPath, ...routeDependencies]

      return {
        functionName,
        functionTitle,
        route: apiRoute,
        config,
        compiled,
        includedFiles,
      }
    }),
  )
}

/**
 * Looks for extended API routes (background and scheduled functions) and extract the config from the source file.
 */
export const getExtendedApiRouteConfigs = async (
  publish: string,
  appDir: string,
  pageExtensions?: string[],
): Promise<Array<ApiRouteConfig>> => {
  const settledApiRoutes = await getApiRouteConfigs(publish, appDir, pageExtensions)

  // We only want to return the API routes that are background or scheduled functions
  return settledApiRoutes.filter((apiRoute) => apiRoute.config.type !== undefined)
}

export const packSingleFunction = (func: ApiRouteConfig): APILambda => ({
  functionName: func.functionName,
  functionTitle: func.functionTitle,
  includedFiles: func.includedFiles,
  routes: [func],
  type: func.config.type,
})

interface FunctionsManifest {
  functions: Array<{ name: string; schedule?: string }>
}

/**
 * Warn the user of the caveats if they're using background or scheduled API routes
 */

export const warnOnApiRoutes = async ({
  FUNCTIONS_DIST,
}: Pick<NetlifyPluginConstants, 'FUNCTIONS_DIST'>): Promise<void> => {
  const functionsManifestPath = join(FUNCTIONS_DIST, 'manifest.json')
  if (!existsSync(functionsManifestPath)) {
    return
  }

  const { functions }: FunctionsManifest = await readJSON(functionsManifestPath)

  if (functions.some((func) => func.name.endsWith('-background'))) {
    console.warn(
      outdent`
        ${chalk.yellowBright`Using background API routes`}
        If your account type does not support background functions, the deploy will fail.
        During local development, background API routes will run as regular API routes, but in production they will immediately return an empty "202 Accepted" response.
      `,
    )
  }

  if (functions.some((func) => func.schedule)) {
    console.warn(
      outdent`
        ${chalk.yellowBright`Using scheduled API routes`}
        These are run on a schedule when deployed to production.
        You can test them locally by loading them in your browser but this will not be available when deployed, and any returned value is ignored.
      `,
    )
  }
}
