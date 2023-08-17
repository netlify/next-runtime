import { promises as fs, existsSync } from 'fs'
import { resolve, join } from 'path'

import type { NetlifyConfig, NetlifyPluginConstants } from '@netlify/build'
import { greenBright } from 'chalk'
import destr from 'destr'
import { copy, copyFile, emptyDir, ensureDir, readJSON, writeJSON, writeJson } from 'fs-extra'
import type { PrerenderManifest } from 'next/dist/build'
import type { MiddlewareManifest } from 'next/dist/build/webpack/plugins/middleware-plugin'
import type { RouteHas } from 'next/dist/lib/load-custom-routes'
import { outdent } from 'outdent'

import { IMAGE_FUNCTION_NAME } from '../constants'

import { getRequiredServerFiles, NextConfig } from './config'
import { getPluginVersion } from './functionsMetaData'
import { makeLocaleOptional, stripLookahead, transformCaptureGroups } from './matchers'
import { RoutesManifest } from './types'
// This is the format as of next@12.2
interface EdgeFunctionDefinitionV1 {
  env: string[]
  files: string[]
  name: string
  page: string
  regexp: string
}

interface AssetRef {
  name: string
  filePath: string
}
export interface MiddlewareMatcher {
  regexp: string
  locale?: false
  has?: RouteHas[]
  missing?: RouteHas[]
}

// This is the format after next@12.3.0
interface EdgeFunctionDefinitionV2 {
  env: string[]
  files: string[]
  name: string
  page: string
  matchers: MiddlewareMatcher[]
  wasm?: AssetRef[]
  assets?: AssetRef[]
}

type EdgeFunctionDefinition = EdgeFunctionDefinitionV1 | EdgeFunctionDefinitionV2

export interface FunctionManifest {
  version: 1
  functions: Array<
    | {
        function: string
        name?: string
        path: string
        cache?: 'manual'
        generator: string
      }
    | {
        function: string
        name?: string
        pattern: string
        cache?: 'manual'
        generator: string
      }
  >
  layers?: Array<{ name: `https://${string}/mod.ts`; flag: string }>
  import_map?: string
}

const maybeLoadJson = <T>(path: string): Promise<T> | null => {
  if (existsSync(path)) {
    return readJSON(path)
  }
}
export const isAppDirRoute = (route: string, appPathRoutesManifest: Record<string, string> | null): boolean =>
  Boolean(appPathRoutesManifest) && Object.values(appPathRoutesManifest).includes(route)

export const loadMiddlewareManifest = (netlifyConfig: NetlifyConfig): Promise<MiddlewareManifest | null> =>
  maybeLoadJson(resolve(netlifyConfig.build.publish, 'server', 'middleware-manifest.json'))

export const loadAppPathRoutesManifest = (netlifyConfig: NetlifyConfig): Promise<Record<string, string> | null> =>
  maybeLoadJson(resolve(netlifyConfig.build.publish, 'app-path-routes-manifest.json'))

export const loadPrerenderManifest = (netlifyConfig: NetlifyConfig): Promise<PrerenderManifest> =>
  readJSON(resolve(netlifyConfig.build.publish, 'prerender-manifest.json'))

/**
 * Convert the Next middleware name into a valid Edge Function name
 */
const sanitizeName = (name: string) => `next_${name.replace(/\W/g, '_')}`

/**
 * Convert the images path to strip the origin (until domain-level Edge functions are supported)
 */
export const sanitizeEdgePath = (imagesPath: string) => new URL(imagesPath, process.env.URL || 'http://n').pathname

// Slightly different spacing in different versions!
const IMPORT_UNSUPPORTED = [
  `Object.defineProperty(globalThis,"__import_unsupported"`,
  `    Object.defineProperty(globalThis, "__import_unsupported"`,
]
/**
 * Concatenates the Next edge function code with the required chunks and adds an export
 */
const getMiddlewareBundle = async ({
  edgeFunctionDefinition,
  netlifyConfig,
}: {
  edgeFunctionDefinition: EdgeFunctionDefinition
  netlifyConfig: NetlifyConfig
}): Promise<string> => {
  const { publish } = netlifyConfig.build

  const shims = await fs.readFile(getEdgeTemplatePath('shims.js'), 'utf8')

  const chunks: Array<string> = [shims]

  chunks.push(`export const _DEFINITION = ${JSON.stringify(edgeFunctionDefinition)}`)

  if ('wasm' in edgeFunctionDefinition) {
    for (const { name, filePath } of edgeFunctionDefinition.wasm) {
      const wasm = await fs.readFile(join(publish, filePath))
      chunks.push(`const ${name} = _base64Decode(${JSON.stringify(wasm.toString('base64'))}).buffer`)
    }
  }

  if ('assets' in edgeFunctionDefinition) {
    chunks.push(`const _ASSETS = {}`)
    for (const { name, filePath } of edgeFunctionDefinition.assets) {
      const wasm = await fs.readFile(join(publish, filePath))
      chunks.push(`_ASSETS[${JSON.stringify(name)}] = ${JSON.stringify(wasm.toString('base64'))}`)
    }
  }

  for (const file of edgeFunctionDefinition.files) {
    const filePath = join(publish, file)

    let data = await fs.readFile(filePath, 'utf8')
    // Next defines an immutable global variable, which is fine unless you have more than one in the bundle
    // This adds a check to see if the global is already defined
    data = IMPORT_UNSUPPORTED.reduce(
      (acc, val) => acc.replace(val, `('__import_unsupported' in globalThis)||${val}`),
      data,
    )
    chunks.push('{', data, '}')
  }

  const exports = /* js */ `export default _ENTRIES["middleware_${edgeFunctionDefinition.name}"].default;`
  chunks.push(exports)
  return chunks.join('\n')
}

const getEdgeTemplatePath = (file: string) => join(__dirname, '..', '..', 'src', 'templates', 'edge', file)

const copyEdgeSourceFile = ({
  file,
  target,
  edgeFunctionDir,
}: {
  file: string
  edgeFunctionDir: string
  target?: string
}) => fs.copyFile(getEdgeTemplatePath(file), join(edgeFunctionDir, target ?? file))

const writeEdgeFunction = async ({
  edgeFunctionDefinition,
  edgeFunctionRoot,
  netlifyConfig,
  functionName,
  matchers = [],
  middleware = false,
}: {
  edgeFunctionDefinition: EdgeFunctionDefinition
  edgeFunctionRoot: string
  netlifyConfig: NetlifyConfig
  functionName: string
  matchers?: Array<MiddlewareMatcher>
  middleware?: boolean
}) => {
  const edgeFunctionDir = join(edgeFunctionRoot, functionName)

  const bundle = await getMiddlewareBundle({
    edgeFunctionDefinition,
    netlifyConfig,
  })

  await ensureDir(edgeFunctionDir)
  await fs.writeFile(join(edgeFunctionDir, 'bundle.js'), bundle)

  await copyEdgeSourceFile({
    edgeFunctionDir,
    file: middleware ? 'middleware-runtime.ts' : 'function-runtime.ts',
    target: 'index.ts',
  })

  if (middleware) {
    // Functions don't have complex matchers, so we can rely on the Netlify matcher
    await writeJson(join(edgeFunctionDir, 'matchers.json'), matchers)
  }
}

const generateEdgeFunctionMiddlewareMatchers = ({
  edgeFunctionDefinition,
  nextConfig,
}: {
  edgeFunctionDefinition: EdgeFunctionDefinition
  edgeFunctionRoot: string
  nextConfig: NextConfig
  cache?: 'manual'
}): Array<MiddlewareMatcher> => {
  // The v1 middleware manifest has a single regexp, but the v2 has an array of matchers
  if ('regexp' in edgeFunctionDefinition) {
    return [{ regexp: edgeFunctionDefinition.regexp }]
  }
  if (nextConfig.i18n) {
    return edgeFunctionDefinition.matchers.map((matcher) => ({
      ...matcher,
      regexp: makeLocaleOptional(matcher.regexp),
    }))
  }
  return edgeFunctionDefinition.matchers
}

const middlewareMatcherToEdgeFunctionDefinition = (
  matcher: MiddlewareMatcher,
  name: string,
  generator: string,
  cache?: 'manual',
): {
  function: string
  name?: string
  pattern: string
  cache?: 'manual'
  generator: string
} => {
  const pattern = transformCaptureGroups(stripLookahead(matcher.regexp))
  return { function: name, pattern, name, cache, generator }
}

export const cleanupEdgeFunctions = ({
  INTERNAL_EDGE_FUNCTIONS_SRC = '.netlify/edge-functions',
}: NetlifyPluginConstants) => emptyDir(INTERNAL_EDGE_FUNCTIONS_SRC)

export const writeDevEdgeFunction = async ({
  INTERNAL_EDGE_FUNCTIONS_SRC = '.netlify/edge-functions',
}: NetlifyPluginConstants) => {
  const generator = await getPluginVersion()
  const manifest: FunctionManifest = {
    functions: [
      {
        function: 'next-dev',
        name: 'netlify dev handler',
        path: '/*',
        generator,
      },
    ],
    version: 1,
  }
  const edgeFunctionRoot = resolve(INTERNAL_EDGE_FUNCTIONS_SRC)
  await emptyDir(edgeFunctionRoot)
  await writeJson(join(edgeFunctionRoot, 'manifest.json'), manifest)
  await copy(getEdgeTemplatePath('../edge-shared'), join(edgeFunctionRoot, 'edge-shared'))

  const edgeFunctionDir = join(edgeFunctionRoot, 'next-dev')
  await ensureDir(edgeFunctionDir)
  await copyEdgeSourceFile({ edgeFunctionDir, file: 'next-dev.js', target: 'index.js' })
}

/**
 * Writes an edge function that routes RSC data requests to the `.rsc` route
 */

export const generateRscDataEdgeManifest = async ({
  prerenderManifest,
  appPathRoutesManifest,
  packagePath,
}: {
  packagePath: string
  prerenderManifest?: PrerenderManifest
  appPathRoutesManifest?: Record<string, string>
}): Promise<FunctionManifest['functions']> => {
  const generator = await getPluginVersion()
  if (!prerenderManifest || !appPathRoutesManifest) {
    return []
  }
  const staticAppdirRoutes: Array<string> = []
  for (const [path, route] of Object.entries(prerenderManifest.routes)) {
    if (isAppDirRoute(route.srcRoute, appPathRoutesManifest) && route.dataRoute) {
      staticAppdirRoutes.push(path, route.dataRoute)
    }
  }
  const dynamicAppDirRoutes: Array<string> = []

  for (const [path, route] of Object.entries(prerenderManifest.dynamicRoutes)) {
    if (isAppDirRoute(path, appPathRoutesManifest) && route.dataRouteRegex) {
      dynamicAppDirRoutes.push(route.routeRegex, route.dataRouteRegex)
    }
  }

  if (staticAppdirRoutes.length === 0 && dynamicAppDirRoutes.length === 0) {
    return []
  }

  const edgeFunctionDir = resolve(packagePath, '.netlify', 'edge-functions', 'rsc-data')
  await ensureDir(edgeFunctionDir)
  await copyEdgeSourceFile({ edgeFunctionDir, file: 'rsc-data.ts' })

  return [
    ...staticAppdirRoutes.map((path) => ({
      function: 'rsc-data',
      name: 'RSC data routing',
      path,
      generator,
    })),
    ...dynamicAppDirRoutes.map((pattern) => ({
      function: 'rsc-data',
      name: 'RSC data routing',
      pattern,
      generator,
    })),
  ]
}

export const getEdgeFunctionPatternForPage = ({
  edgeFunctionDefinition,
  pageRegexMap,
  appPathRoutesManifest,
}: {
  edgeFunctionDefinition: EdgeFunctionDefinition
  pageRegexMap: Map<string, string>
  appPathRoutesManifest?: Record<string, string>
}): string => {
  // We don't just use the matcher from the edge function definition, because it doesn't handle trailing slashes

  // appDir functions have a name that _isn't_ the route name, but rather the route with `/page` appended
  const regexp = pageRegexMap.get(appPathRoutesManifest?.[edgeFunctionDefinition.page] ?? edgeFunctionDefinition.page)
  if (regexp) {
    return regexp
  }
  if ('regexp' in edgeFunctionDefinition) {
    return edgeFunctionDefinition.regexp.replace(/([^/])\$$/, '$1/?$')
  }
  // If we need to fall back to the matcher, we need to add an optional trailing slash
  return edgeFunctionDefinition.matchers?.[0].regexp.replace(/([^/])\$$/, '$1/?$')
}

/**
 * Writes Edge Functions for the Next middleware
 */

// eslint-disable-next-line max-lines-per-function
export const writeEdgeFunctions = async ({
  netlifyConfig,
  routesManifest,
  constants: { PACKAGE_PATH = '' },
}: {
  netlifyConfig: NetlifyConfig
  routesManifest: RoutesManifest
  constants: NetlifyPluginConstants
}) => {
  const generator = await getPluginVersion()

  const manifest: FunctionManifest = {
    functions: [],
    layers: [],
    version: 1,
  }

  const edgeFunctionRoot = resolve(PACKAGE_PATH, '.netlify', 'edge-functions')
  await emptyDir(edgeFunctionRoot)

  const { publish } = netlifyConfig.build
  const nextConfigFile = await getRequiredServerFiles(publish)
  const nextConfig = nextConfigFile.config
  const usesAppDir = nextConfig.experimental?.appDir

  await copy(getEdgeTemplatePath('../edge-shared'), join(edgeFunctionRoot, 'edge-shared'))
  await writeJSON(join(edgeFunctionRoot, 'edge-shared', 'nextConfig.json'), nextConfig)
  await copy(join(publish, 'prerender-manifest.json'), join(edgeFunctionRoot, 'edge-shared', 'prerender-manifest.json'))

  // early return if edge is disabled
  if (destr(process.env.NEXT_DISABLE_NETLIFY_EDGE)) {
    console.log('Environment variable NEXT_DISABLE_NETLIFY_EDGE has been set, skipping Netlify Edge Function creation.')
    return
  }

  const rscFunctions = await generateRscDataEdgeManifest({
    packagePath: PACKAGE_PATH,
    prerenderManifest: await loadPrerenderManifest(netlifyConfig),
    appPathRoutesManifest: await loadAppPathRoutesManifest(netlifyConfig),
  })

  manifest.functions.push(...rscFunctions)

  const middlewareManifest = await loadMiddlewareManifest(netlifyConfig)
  if (!middlewareManifest) {
    console.error("Couldn't find the middleware manifest")
    return
  }

  let usesEdge = false

  for (const middleware of middlewareManifest.sortedMiddleware) {
    usesEdge = true
    const edgeFunctionDefinition = middlewareManifest.middleware[middleware]
    const functionName = sanitizeName(edgeFunctionDefinition.name)
    const matchers = generateEdgeFunctionMiddlewareMatchers({
      edgeFunctionDefinition,
      edgeFunctionRoot,
      nextConfig,
    })
    await writeEdgeFunction({
      edgeFunctionDefinition,
      edgeFunctionRoot,
      netlifyConfig,
      functionName,
      matchers,
      middleware: true,
    })

    manifest.functions.push(
      ...matchers.map((matcher) => middlewareMatcherToEdgeFunctionDefinition(matcher, functionName, generator)),
    )
  }
  // Functions (i.e. not middleware, but edge SSR and API routes)
  if (typeof middlewareManifest.functions === 'object') {
    // When using the app dir, we also need to check if the EF matches a page
    const appPathRoutesManifest = await loadAppPathRoutesManifest(netlifyConfig)

    // A map of all route pages to their page regex. This is used for pages dir and appDir.
    const pageRegexMap = new Map(
      [...(routesManifest.dynamicRoutes || []), ...(routesManifest.staticRoutes || [])].map((route) => [
        route.page,
        route.regex,
      ]),
    )
    // Create a map of pages-dir routes to their data route regex (appDir uses the same route as the HTML)
    const dataRoutesMap = new Map(
      [...(routesManifest.dataRoutes || [])].map((route) => [route.page, route.dataRouteRegex]),
    )

    for (const edgeFunctionDefinition of Object.values(middlewareManifest.functions)) {
      usesEdge = true
      const functionName = sanitizeName(edgeFunctionDefinition.name)
      await writeEdgeFunction({
        edgeFunctionDefinition,
        edgeFunctionRoot,
        netlifyConfig,
        functionName,
      })
      const pattern = getEdgeFunctionPatternForPage({
        edgeFunctionDefinition,
        pageRegexMap,
        appPathRoutesManifest,
      })
      manifest.functions.push({
        function: functionName,
        name: edgeFunctionDefinition.name,
        pattern,
        // cache: "manual" is currently experimental, so we restrict it to sites that use experimental appDir
        cache: usesAppDir ? 'manual' : undefined,
        generator,
      })
      // pages-dir page routes also have a data route. If there's a match, add an entry mapping that to the function too
      const dataRoute = dataRoutesMap.get(edgeFunctionDefinition.page)
      if (dataRoute) {
        manifest.functions.push({
          function: functionName,
          name: edgeFunctionDefinition.name,
          pattern: dataRoute,
          cache: usesAppDir ? 'manual' : undefined,
          generator,
        })
      }
    }
  }

  if (
    destr(process.env.NEXT_FORCE_EDGE_IMAGES) &&
    !destr(process.env.NEXT_DISABLE_EDGE_IMAGES) &&
    !destr(process.env.DISABLE_IPX)
  ) {
    usesEdge = true
    console.log(
      'Using Netlify Edge Functions for image format detection. Set env var "NEXT_DISABLE_EDGE_IMAGES=true" to disable.',
    )
    const edgeFunctionDir = join(edgeFunctionRoot, 'ipx')
    await ensureDir(edgeFunctionDir)
    await copyEdgeSourceFile({ edgeFunctionDir, file: 'ipx.ts', target: 'index.ts' })
    await copyFile(
      join('.netlify', 'functions-internal', IMAGE_FUNCTION_NAME, 'imageconfig.json'),
      join(edgeFunctionDir, 'imageconfig.json'),
    )

    manifest.functions.push({
      function: 'ipx',
      name: 'next/image handler',
      path: nextConfig.images.path ? sanitizeEdgePath(nextConfig.images.path) : '/_next/image',
      generator,
    })

    manifest.layers.push({
      name: 'https://ipx-edge-function-layer.netlify.app/mod.ts',
      flag: 'ipx-edge-function-layer-url',
    })
  } else {
    console.log(
      'You are not using Netlify Edge Functions for image format detection. Set env var "NEXT_FORCE_EDGE_IMAGES=true" to enable.',
    )
  }

  if (usesEdge) {
    console.log(outdent`
      ✨ Deploying middleware and functions to ${greenBright`Netlify Edge Functions`} ✨
    `)
  }
  await writeJson(join(edgeFunctionRoot, 'manifest.json'), manifest)
}
