import type { NetlifyConfig, NetlifyPluginConstants } from '@netlify/build'
import bridgeFile from '@vercel/node-bridge'
import chalk from 'chalk'
import destr from 'destr'
import { copyFile, ensureDir, existsSync, readJSON, writeFile, writeJSON } from 'fs-extra'
import type { ImageConfigComplete, RemotePattern } from 'next/dist/shared/lib/image-config'
import { outdent } from 'outdent'
import { join, relative, resolve } from 'pathe'

import {
  HANDLER_FUNCTION_NAME,
  ODB_FUNCTION_NAME,
  IMAGE_FUNCTION_NAME,
  DEFAULT_FUNCTIONS_SRC,
  HANDLER_FUNCTION_TITLE,
  ODB_FUNCTION_TITLE,
  IMAGE_FUNCTION_TITLE,
} from '../constants'
import { getApiHandler } from '../templates/getApiHandler'
import { getHandler } from '../templates/getHandler'
import { getResolverForPages, getResolverForSourceFiles } from '../templates/getPageResolver'

import { ApiConfig, ApiRouteType, extractConfigFromFile, isEdgeConfig } from './analysis'
import { getSourceFileForPage } from './files'
import { writeFunctionConfiguration } from './functionsMetaData'
import { getFunctionNameForPage } from './utils'

export interface ApiRouteConfig {
  route: string
  config: ApiConfig
  compiled: string
}

export const generateFunctions = async (
  { FUNCTIONS_SRC = DEFAULT_FUNCTIONS_SRC, INTERNAL_FUNCTIONS_SRC, PUBLISH_DIR }: NetlifyPluginConstants,
  appDir: string,
  apiRoutes: Array<ApiRouteConfig>,
): Promise<void> => {
  const publish = resolve(PUBLISH_DIR)
  const functionsDir = resolve(INTERNAL_FUNCTIONS_SRC || FUNCTIONS_SRC)
  const functionDir = join(functionsDir, HANDLER_FUNCTION_NAME)
  const publishDir = relative(functionDir, publish)

  for (const { route, config, compiled } of apiRoutes) {
    // Don't write a lambda if the runtime is edge
    if (isEdgeConfig(config.runtime)) {
      continue
    }
    const apiHandlerSource = await getApiHandler({
      page: route,
      config,
      publishDir,
      appDir: relative(functionDir, appDir),
    })
    const functionName = getFunctionNameForPage(route, config.type === ApiRouteType.BACKGROUND)
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

    const resolverSource = await getResolverForSourceFiles({
      functionsDir,
      // These extra pages are always included by Next.js
      sourceFiles: [compiled, 'pages/_app.js', 'pages/_document.js', 'pages/_error.js'].map(resolveSourceFile),
    })
    await writeFile(join(functionsDir, functionName, 'pages.js'), resolverSource)
  }

  const writeHandler = async (functionName: string, functionTitle: string, isODB: boolean) => {
    const handlerSource = await getHandler({
      isODB,
      publishDir,
      appDir: relative(functionDir, appDir),
      appDirAbsolute: appDir,
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

/**
 * Look for API routes, and extract the config from the source file.
 */
export const getApiRouteConfigs = async (publish: string, baseDir: string): Promise<Array<ApiRouteConfig>> => {
  const pages = await readJSON(join(publish, 'server', 'pages-manifest.json'))
  const apiRoutes = Object.keys(pages).filter((page) => page.startsWith('/api/'))
  // two possible places
  // Ref: https://nextjs.org/docs/advanced-features/src-directory
  const pagesDir = join(baseDir, 'pages')
  const srcPagesDir = join(baseDir, 'src', 'pages')

  return await Promise.all(
    apiRoutes.map(async (apiRoute) => {
      const filePath = getSourceFileForPage(apiRoute, [pagesDir, srcPagesDir])
      return { route: apiRoute, config: await extractConfigFromFile(filePath), compiled: pages[apiRoute] }
    }),
  )
}

/**
 * Looks for extended API routes (background and scheduled functions) and extract the config from the source file.
 */
export const getExtendedApiRouteConfigs = async (publish: string, baseDir: string): Promise<Array<ApiRouteConfig>> => {
  const settledApiRoutes = await getApiRouteConfigs(publish, baseDir)

  // We only want to return the API routes that are background or scheduled functions
  return settledApiRoutes.filter((apiRoute) => apiRoute.config.type !== undefined)
}

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
