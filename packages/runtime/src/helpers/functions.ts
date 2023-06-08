import type { NetlifyConfig, NetlifyPluginConstants } from '@netlify/build'
import bridgeFile from '@vercel/node-bridge'
import chalk from 'chalk'
import destr from 'destr'
import { copyFile, ensureDir, existsSync, readJSON, writeFile, writeJSON, stat } from 'fs-extra'
import type { ImageConfigComplete, RemotePattern } from 'next/dist/shared/lib/image-config'
import { outdent } from 'outdent'
import { join, relative, resolve, dirname } from 'pathe'
import glob from 'tiny-glob'

import {
  HANDLER_FUNCTION_NAME,
  ODB_FUNCTION_NAME,
  IMAGE_FUNCTION_NAME,
  DEFAULT_FUNCTIONS_SRC,
  HANDLER_FUNCTION_TITLE,
  ODB_FUNCTION_TITLE,
  IMAGE_FUNCTION_TITLE,
  LAMBDA_WARNING_SIZE,
} from '../constants'
import { getApiHandler } from '../templates/getApiHandler'
import { getHandler } from '../templates/getHandler'
import { getResolverForPages, getResolverForSourceFiles } from '../templates/getPageResolver'

import { ApiConfig, extractConfigFromFile, isEdgeConfig } from './analysis'
import { getRequiredServerFiles } from './config'
import { getDependenciesOfFile, getServerFile, getSourceFileForPage } from './files'
import { writeFunctionConfiguration } from './functionsMetaData'
import { pack } from './pack'
import { ApiRouteType } from './types'
import { getFunctionNameForPage } from './utils'

export interface ApiRouteConfig {
  functionName: string
  route: string
  config: ApiConfig
  compiled: string
  includedFiles: string[]
}

export interface APILambda {
  functionName: string
  routes: ApiRouteConfig[]
  includedFiles: string[]
  type?: ApiRouteType
}

export const generateFunctions = async (
  { FUNCTIONS_SRC = DEFAULT_FUNCTIONS_SRC, INTERNAL_FUNCTIONS_SRC, PUBLISH_DIR }: NetlifyPluginConstants,
  appDir: string,
  apiLambdas: APILambda[],
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
    const { functionName, routes, type, includedFiles } = apiLambda

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
      join(__dirname, '..', '..', 'lib', 'templates', 'handlerUtils.js'),
      join(functionsDir, functionName, 'handlerUtils.js'),
    )
    writeFunctionConfiguration({ functionName, functionTitle, functionsDir })
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
  FUNCTIONS_SRC = DEFAULT_FUNCTIONS_SRC,
  PUBLISH_DIR,
}: NetlifyPluginConstants): Promise<void> => {
  const functionsPath = INTERNAL_FUNCTIONS_SRC || FUNCTIONS_SRC

  const jsSource = await getResolverForPages(PUBLISH_DIR)

  await writeFile(join(functionsPath, ODB_FUNCTION_NAME, 'pages.js'), jsSource)
  await writeFile(join(functionsPath, HANDLER_FUNCTION_NAME, 'pages.js'), jsSource)
}

// Move our next/image function into the correct functions directory
export const setupImageFunction = async ({
  constants: { INTERNAL_FUNCTIONS_SRC, FUNCTIONS_SRC = DEFAULT_FUNCTIONS_SRC, IS_LOCAL },
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

export const getAPIPRouteCommonDependencies = async (publish: string) => {
  const deps = await Promise.all([
    traceRequiredServerFiles(publish),
    traceNextServer(publish),

    // used by our own bridge.js
    traceNPMPackage('follow-redirects', publish),
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

export const getAPILambdas = async (
  publish: string,
  baseDir: string,
  pageExtensions: string[],
): Promise<APILambda[]> => {
  const commonDependencies = await getAPIPRouteCommonDependencies(publish)

  const threshold = LAMBDA_WARNING_SIZE - (await getBundleWeight(commonDependencies))

  const apiRoutes = await getApiRouteConfigs(publish, baseDir, pageExtensions)

  const packFunctions = async (routes: ApiRouteConfig[], type?: ApiRouteType): Promise<APILambda[]> => {
    const weighedRoutes = await Promise.all(
      routes.map(async (route) => ({ value: route, weight: await getBundleWeight(route.includedFiles) })),
    )

    const bins = pack(weighedRoutes, threshold)

    return bins.map((bin, index) => ({
      functionName: bin.length === 1 ? bin[0].functionName : `api-${index}`,
      routes: bin,
      includedFiles: [...commonDependencies, ...routes.flatMap((route) => route.includedFiles)],
      type,
    }))
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
  pageExtensions: string[],
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

      const compiled = pages[apiRoute]
      const compiledPath = join(publish, 'server', compiled)

      const routeDependencies = await getDependenciesOfFile(compiledPath)
      const includedFiles = [compiledPath, ...routeDependencies]

      return {
        functionName,
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
  pageExtensions: string[],
): Promise<Array<ApiRouteConfig>> => {
  const settledApiRoutes = await getApiRouteConfigs(publish, appDir, pageExtensions)

  // We only want to return the API routes that are background or scheduled functions
  return settledApiRoutes.filter((apiRoute) => apiRoute.config.type !== undefined)
}

export const packSingleFunction = (func: ApiRouteConfig): APILambda => ({
  functionName: func.functionName,
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
