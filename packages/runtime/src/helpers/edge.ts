/* eslint-disable max-lines */
import { promises as fs, existsSync } from 'fs'
import { resolve, join } from 'path'

import type { NetlifyConfig, NetlifyPluginConstants } from '@netlify/build'
import { copy, copyFile, emptyDir, ensureDir, readJSON, readJson, writeJSON, writeJson } from 'fs-extra'
import type { MiddlewareManifest } from 'next/dist/build/webpack/plugins/middleware-plugin'
import type { RouteHas } from 'next/dist/lib/load-custom-routes'

import { getRequiredServerFiles } from './config'
import { RoutesManifest } from './types'

// This is the format as of next@12.2
interface EdgeFunctionDefinitionV1 {
  env: string[]
  files: string[]
  name: string
  page: string
  regexp: string
}

export interface MiddlewareMatcher {
  regexp: string
  locale?: false
  has?: RouteHas[]
}

// This is the format after next@12.3.0
interface EdgeFunctionDefinitionV2 {
  env: string[]
  files: string[]
  name: string
  page: string
  matchers: MiddlewareMatcher[]
}

type EdgeFunctionDefinition = EdgeFunctionDefinitionV1 | EdgeFunctionDefinitionV2

export interface FunctionManifest {
  version: 1
  functions: Array<
    | {
        function: string
        path: string
      }
    | {
        function: string
        pattern: string
      }
  >
  import_map?: string
}

const maybeLoadJson = <T>(path: string): Promise<T> | null => {
  if (existsSync(path)) {
    return readJson(path)
  }
}

export const loadMiddlewareManifest = (netlifyConfig: NetlifyConfig): Promise<MiddlewareManifest | null> =>
  maybeLoadJson(resolve(netlifyConfig.build.publish, 'server', 'middleware-manifest.json'))

export const loadAppPathRoutesManifest = (netlifyConfig: NetlifyConfig): Promise<Record<string, string> | null> =>
  maybeLoadJson(resolve(netlifyConfig.build.publish, 'app-path-routes-manifest.json'))

/**
 * Convert the Next middleware name into a valid Edge Function name
 */
const sanitizeName = (name: string) => `next_${name.replace(/\W/g, '_')}`

/**
 * Initialization added to the top of the edge function bundle
 */
const preamble = /* js */ `
  // Deno defines "window", but naughty libraries think this means it's a browser
  delete globalThis.window
  globalThis.process = { env: {...Deno.env.toObject(), NEXT_RUNTIME: 'edge', 'NEXT_PRIVATE_MINIMAL_MODE': '1' } }
  // Next uses "self" as a function-scoped global-like object
  const self = {}
  let _ENTRIES = {}
`

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
  const chunks: Array<string> = [preamble]
  for (const file of edgeFunctionDefinition.files) {
    const filePath = join(publish, file)

    let data = await fs.readFile(filePath, 'utf8')
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
  pageRegexMap,
  appPathRoutesManifest = {},
}: {
  edgeFunctionDefinition: EdgeFunctionDefinition
  edgeFunctionRoot: string
  netlifyConfig: NetlifyConfig
  pageRegexMap?: Map<string, string>
  appPathRoutesManifest?: Record<string, string>
}): Promise<
  Array<{
    function: string
    pattern: string
  }>
> => {
  const name = sanitizeName(edgeFunctionDefinition.name)
  const edgeFunctionDir = join(edgeFunctionRoot, name)

  const bundle = await getMiddlewareBundle({
    edgeFunctionDefinition,
    netlifyConfig,
  })

  await ensureDir(edgeFunctionDir)
  await fs.writeFile(join(edgeFunctionDir, 'bundle.js'), bundle)

  await copyEdgeSourceFile({
    edgeFunctionDir,
    file: 'runtime.ts',
    target: 'index.ts',
  })

  const matchers: EdgeFunctionDefinitionV2['matchers'] = []

  // The v1 middleware manifest has a single regexp, but the v2 has an array of matchers
  if ('regexp' in edgeFunctionDefinition) {
    matchers.push({ regexp: edgeFunctionDefinition.regexp })
  } else {
    matchers.push(...edgeFunctionDefinition.matchers)
  }

  // If the EF matches a page, it's an app dir page so needs a matcher too
  // The object will be empty if appDir isn't enabled in the Next config
  if (pageRegexMap && edgeFunctionDefinition.page in appPathRoutesManifest) {
    const regexp = pageRegexMap.get(appPathRoutesManifest[edgeFunctionDefinition.page])
    if (regexp) {
      matchers.push({ regexp })
    }
  }

  await writeJson(join(edgeFunctionDir, 'matchers.json'), matchers)

  // We add a defintion for each matching path
  return matchers.map((matcher) => {
    const pattern = matcher.regexp
    return { function: name, pattern }
  })
}
export const cleanupEdgeFunctions = ({
  INTERNAL_EDGE_FUNCTIONS_SRC = '.netlify/edge-functions',
}: NetlifyPluginConstants) => emptyDir(INTERNAL_EDGE_FUNCTIONS_SRC)

export const writeDevEdgeFunction = async ({
  INTERNAL_EDGE_FUNCTIONS_SRC = '.netlify/edge-functions',
}: NetlifyPluginConstants) => {
  const manifest: FunctionManifest = {
    functions: [
      {
        function: 'next-dev',
        path: '/*',
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
 * Writes Edge Functions for the Next middleware
 */
export const writeEdgeFunctions = async ({
  netlifyConfig,
  routesManifest,
}: {
  netlifyConfig: NetlifyConfig
  routesManifest: RoutesManifest
}) => {
  const manifest: FunctionManifest = {
    functions: [],
    version: 1,
  }

  const edgeFunctionRoot = resolve('.netlify', 'edge-functions')
  await emptyDir(edgeFunctionRoot)

  await copy(getEdgeTemplatePath('../edge-shared'), join(edgeFunctionRoot, 'edge-shared'))

  const { publish } = netlifyConfig.build
  const nextConfigFile = await getRequiredServerFiles(publish)
  const nextConfig = nextConfigFile.config
  await writeJSON(join(edgeFunctionRoot, 'edge-shared', 'nextConfig.json'), nextConfig)

  if (!process.env.NEXT_DISABLE_EDGE_IMAGES) {
    console.log(
      'Using Netlify Edge Functions for image format detection. Set env var "NEXT_DISABLE_EDGE_IMAGES=true" to disable.',
    )
    const edgeFunctionDir = join(edgeFunctionRoot, 'ipx')
    await ensureDir(edgeFunctionDir)
    await copyEdgeSourceFile({ edgeFunctionDir, file: 'ipx.ts', target: 'index.ts' })
    await copyFile(
      join('.netlify', 'functions-internal', '_ipx', 'imageconfig.json'),
      join(edgeFunctionDir, 'imageconfig.json'),
    )
    manifest.functions.push({
      function: 'ipx',
      path: '/_next/image*',
    })
  }
  if (process.env.NEXT_DISABLE_NETLIFY_EDGE !== 'true' && process.env.NEXT_DISABLE_NETLIFY_EDGE !== '1') {
    const middlewareManifest = await loadMiddlewareManifest(netlifyConfig)
    if (!middlewareManifest) {
      console.error("Couldn't find the middleware manifest")
      return
    }

    for (const middleware of middlewareManifest.sortedMiddleware) {
      const edgeFunctionDefinition = middlewareManifest.middleware[middleware]
      const functionDefinitions = await writeEdgeFunction({
        edgeFunctionDefinition,
        edgeFunctionRoot,
        netlifyConfig,
      })
      manifest.functions.push(...functionDefinitions)
    }
    // Older versions of the manifest format don't have the functions field
    // No, the version field was not incremented
    if (typeof middlewareManifest.functions === 'object') {
      // When using the app dir, we also need to check if the EF matches a page
      const appPathRoutesManifest = await loadAppPathRoutesManifest(netlifyConfig)

      const pageRegexMap = new Map(
        [...routesManifest.dynamicRoutes, ...routesManifest.staticRoutes].map((route) => [route.page, route.regex]),
      )

      for (const edgeFunctionDefinition of Object.values(middlewareManifest.functions)) {
        const functionDefinitions = await writeEdgeFunction({
          edgeFunctionDefinition,
          edgeFunctionRoot,
          netlifyConfig,
          pageRegexMap,
          appPathRoutesManifest,
        })
        manifest.functions.push(...functionDefinitions)
      }
    }
  }
  await writeJson(join(edgeFunctionRoot, 'manifest.json'), manifest)
}

export const enableEdgeInNextConfig = async (publish: string) => {
  const configFile = join(publish, 'required-server-files.json')
  const config = await readJSON(configFile)
  await writeJSON(configFile, config)
}
/* eslint-enable max-lines */
