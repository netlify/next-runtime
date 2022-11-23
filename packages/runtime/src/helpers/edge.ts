/* eslint-disable max-lines */
import { promises as fs, existsSync } from 'fs'
import { resolve, join } from 'path'

import type { NetlifyConfig, NetlifyPluginConstants } from '@netlify/build'
import { greenBright } from 'chalk'
import destr from 'destr'
import { copy, copyFile, emptyDir, ensureDir, readJson, writeJSON, writeJson } from 'fs-extra'
import type { MiddlewareManifest } from 'next/dist/build/webpack/plugins/middleware-plugin'
import type { RouteHas } from 'next/dist/lib/load-custom-routes'
import { outdent } from 'outdent'

import { getRequiredServerFiles, NextConfig } from './config'
import { makeLocaleOptional, stripLookahead } from './matchers'
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
      }
    | {
        function: string
        name?: string
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
import {
  decode as _base64Decode,
} from "https://deno.land/std@0.159.0/encoding/base64.ts";
// Deno defines "window", but naughty libraries think this means it's a browser
delete globalThis.window
globalThis.process = { env: {...Deno.env.toObject(), NEXT_RUNTIME: 'edge', 'NEXT_PRIVATE_MINIMAL_MODE': '1' } }
// Next uses "self" as a function-scoped global-like object
const self = {}
let _ENTRIES = {}

// Next.js uses this extension to the Headers API implemented by Cloudflare workerd
if(!('getAll' in Headers.prototype)) {
  Headers.prototype.getAll = function getAll(name) {
    name = name.toLowerCase();
    if (name !== "set-cookie") {
      throw new Error("Headers.getAll is only supported for Set-Cookie");
    }
    return [...this.entries()]
      .filter(([key]) => key === name)
      .map(([, value]) => value);
  };
}
//  Next uses blob: urls to refer to local assets, so we need to intercept these
const _fetch = globalThis.fetch
const fetch = async (url, init) => {
  try {
    if (typeof url === 'object' && url.href?.startsWith('blob:')) {
      const key = url.href.slice(5)
      if (key in _ASSETS) {
        return new Response(_base64Decode(_ASSETS[key]))
      }
    }
    return await _fetch(url, init)
  } catch (error) {
    console.error(error)
    throw error
  }
}

`

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
  const chunks: Array<string> = [preamble]

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
  pageRegexMap,
  appPathRoutesManifest = {},
  nextConfig,
}: {
  edgeFunctionDefinition: EdgeFunctionDefinition
  edgeFunctionRoot: string
  netlifyConfig: NetlifyConfig
  pageRegexMap?: Map<string, string>
  appPathRoutesManifest?: Record<string, string>
  nextConfig: NextConfig
}): Promise<
  Array<{
    function: string
    name: string
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
  } else if (nextConfig.i18n) {
    matchers.push(
      ...edgeFunctionDefinition.matchers.map((matcher) => ({
        ...matcher,
        regexp: makeLocaleOptional(matcher.regexp),
      })),
    )
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
    const pattern = stripLookahead(matcher.regexp)
    return { function: name, pattern, name: edgeFunctionDefinition.name }
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
        name: 'netlify dev handler',
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

  const { publish } = netlifyConfig.build
  const nextConfigFile = await getRequiredServerFiles(publish)
  const nextConfig = nextConfigFile.config
  await copy(getEdgeTemplatePath('../edge-shared'), join(edgeFunctionRoot, 'edge-shared'))
  await writeJSON(join(edgeFunctionRoot, 'edge-shared', 'nextConfig.json'), nextConfig)

  if (
    !destr(process.env.NEXT_DISABLE_EDGE_IMAGES) &&
    !destr(process.env.NEXT_DISABLE_NETLIFY_EDGE) &&
    !destr(process.env.DISABLE_IPX)
  ) {
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
      name: 'next/image handler',
      path: '/_next/image*',
    })
  }
  if (!destr(process.env.NEXT_DISABLE_NETLIFY_EDGE)) {
    const middlewareManifest = await loadMiddlewareManifest(netlifyConfig)
    if (!middlewareManifest) {
      console.error("Couldn't find the middleware manifest")
      return
    }

    let usesEdge = false

    for (const middleware of middlewareManifest.sortedMiddleware) {
      usesEdge = true
      const edgeFunctionDefinition = middlewareManifest.middleware[middleware]
      const functionDefinitions = await writeEdgeFunction({
        edgeFunctionDefinition,
        edgeFunctionRoot,
        netlifyConfig,
        nextConfig,
      })
      manifest.functions.push(...functionDefinitions)
    }
    // Older versions of the manifest format don't have the functions field
    // No, the version field was not incremented
    if (typeof middlewareManifest.functions === 'object') {
      // When using the app dir, we also need to check if the EF matches a page
      const appPathRoutesManifest = await loadAppPathRoutesManifest(netlifyConfig)

      const pageRegexMap = new Map(
        [...(routesManifest.dynamicRoutes || []), ...(routesManifest.staticRoutes || [])].map((route) => [
          route.page,
          route.regex,
        ]),
      )

      for (const edgeFunctionDefinition of Object.values(middlewareManifest.functions)) {
        usesEdge = true
        const functionDefinitions = await writeEdgeFunction({
          edgeFunctionDefinition,
          edgeFunctionRoot,
          netlifyConfig,
          pageRegexMap,
          appPathRoutesManifest,
          nextConfig,
        })
        manifest.functions.push(...functionDefinitions)
      }
    }
    if (usesEdge) {
      console.log(outdent`
        ✨ Deploying middleware and functions to ${greenBright`Netlify Edge Functions`} ✨
        This feature is in beta. Please share your feedback here: https://ntl.fyi/next-netlify-edge
      `)
    }
  }
  await writeJson(join(edgeFunctionRoot, 'manifest.json'), manifest)
}

/* eslint-enable max-lines */
