/* eslint-disable max-lines */
import { promises as fs, existsSync } from 'fs'
import { resolve, join } from 'path'

import type { NetlifyConfig } from '@netlify/build'
import { copyFile, emptyDir, ensureDir, readJSON, readJson, writeJSON, writeJson } from 'fs-extra'
import type { MiddlewareManifest } from 'next/dist/build/webpack/plugins/middleware-plugin'

type EdgeFunctionDefinition = MiddlewareManifest['middleware']['name']

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
}

export const loadMiddlewareManifest = (netlifyConfig: NetlifyConfig): Promise<MiddlewareManifest | null> => {
  const middlewarePath = resolve(netlifyConfig.build.publish, 'server', 'middleware-manifest.json')
  if (!existsSync(middlewarePath)) {
    return null
  }
  return readJson(middlewarePath)
}

/**
 * Convert the Next middleware name into a valid Edge Function name
 */
const sanitizeName = (name: string) => `next_${name.replace(/\W/g, '_')}`

/**
 * Initialization added to the top of the edge function bundle
 */
const bootstrap = /* js */ `
globalThis.process = { env: {...Deno.env.toObject(), NEXT_RUNTIME: 'edge', 'NEXT_PRIVATE_MINIMAL_MODE': '1' } }
globalThis._ENTRIES ||= {}
// Deno defines "window", but naughty libraries think this means it's a browser
delete globalThis.window

`

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
  const chunks: Array<string> = [bootstrap]
  for (const file of edgeFunctionDefinition.files) {
    const filePath = join(publish, file)
    const data = await fs.readFile(filePath, 'utf8')
    chunks.push('{', data, '}')
  }

  const middleware = await fs.readFile(join(publish, `server`, `${edgeFunctionDefinition.name}.js`), 'utf8')

  chunks.push(middleware)

  const exports = /* js */ `export default _ENTRIES["middleware_${edgeFunctionDefinition.name}"].default;`
  chunks.push(exports)
  return chunks.join('\n')
}

const copyEdgeSourceFile = ({
  file,
  target,
  edgeFunctionDir,
}: {
  file: string
  edgeFunctionDir: string
  target?: string
}) => fs.copyFile(join(__dirname, '..', '..', 'src', 'templates', 'edge', file), join(edgeFunctionDir, target ?? file))

// Edge functions don't support lookahead expressions
const stripLookahead = (regex: string) => regex.replace('^/(?!_next)', '^/')

const writeEdgeFunction = async ({
  edgeFunctionDefinition,
  edgeFunctionRoot,
  netlifyConfig,
}: {
  edgeFunctionDefinition: EdgeFunctionDefinition
  edgeFunctionRoot: string
  netlifyConfig: NetlifyConfig
}): Promise<{
  function: string
  pattern: string
}> => {
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

  await copyEdgeSourceFile({ edgeFunctionDir, file: 'utils.ts' })
  return {
    function: name,
    pattern: stripLookahead(edgeFunctionDefinition.regexp),
  }
}

/**
 * Writes Edge Functions for the Next middleware
 */
export const writeEdgeFunctions = async (netlifyConfig: NetlifyConfig) => {
  const manifest: FunctionManifest = {
    functions: [],
    version: 1,
  }

  const edgeFunctionRoot = resolve('.netlify', 'edge-functions')
  await emptyDir(edgeFunctionRoot)

  if (!process.env.NEXT_DISABLE_EDGE_IMAGES) {
    if (!process.env.NEXT_USE_NETLIFY_EDGE) {
      console.log(
        'Using Netlify Edge Functions for image format detection. Set env var "NEXT_DISABLE_EDGE_IMAGES=true" to disable.',
      )
    }
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
  if (process.env.NEXT_USE_NETLIFY_EDGE) {
    const middlewareManifest = await loadMiddlewareManifest(netlifyConfig)
    if (!middlewareManifest) {
      console.error("Couldn't find the middleware manifest")
      return
    }

    for (const middleware of middlewareManifest.sortedMiddleware) {
      const edgeFunctionDefinition = middlewareManifest.middleware[middleware]
      const functionDefinition = await writeEdgeFunction({
        edgeFunctionDefinition,
        edgeFunctionRoot,
        netlifyConfig,
      })
      manifest.functions.push(functionDefinition)
    }
    // Older versions of the manifest format don't have the functions field
    // No, the version field was not incremented
    if (typeof middlewareManifest.functions === 'object') {
      for (const edgeFunctionDefinition of Object.values(middlewareManifest.functions)) {
        const functionDefinition = await writeEdgeFunction({
          edgeFunctionDefinition,
          edgeFunctionRoot,
          netlifyConfig,
        })
        manifest.functions.push(functionDefinition)
      }
    }
  }
  await writeJson(join(edgeFunctionRoot, 'manifest.json'), manifest)
}

export const updateConfig = async (publish: string) => {
  const configFile = join(publish, 'required-server-files.json')
  const config = await readJSON(configFile)
  config.config.env.NEXT_USE_NETLIFY_EDGE = 'true'
  await writeJSON(configFile, config)
}
/* eslint-enable max-lines */
