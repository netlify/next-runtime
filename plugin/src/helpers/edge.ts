import { promises as fs, existsSync } from 'fs'
import { resolve, join } from 'path'

import type { NetlifyConfig } from '@netlify/build'
import { emptyDir, ensureDir, readJSON, readJson, writeJSON, writeJson } from 'fs-extra'
import type { MiddlewareManifest } from 'next/dist/build/webpack/plugins/middleware-plugin'

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

const loadMiddlewareManifest = (netlifyConfig: NetlifyConfig): Promise<MiddlewareManifest | null> => {
  const middlewarePath = resolve(netlifyConfig.build.publish, 'server', 'middleware-manifest.json')
  if (!existsSync(middlewarePath)) {
    return null
  }
  return readJson(middlewarePath)
}

/**
 * Convert the Next middleware name into a valid Edge Function name
 */
const sanitizeName = (name: string) => `next${name === '/' ? '_index' : name.replace(/\W/g, '_')}`

/**
 * Initialization added to the top of the edge function bundle
 */
const bootstrap = /* js */ `
globalThis._ENTRIES ||= {}
delete globalThis.window

`

// TODO: set the proper env
const getEnv = () => /* js */ `
globalThis.process = { env: {} }
`

/**
 * Concatenates the Next edge function code with the required chunks and adds an export
 */
const getMiddlewareBundle = async ({
  middlewareDefinition,
  netlifyConfig,
}: {
  middlewareDefinition: MiddlewareManifest['middleware']['name']
  netlifyConfig: NetlifyConfig
}): Promise<string> => {
  const { publish } = netlifyConfig.build
  const chunks: Array<string> = [bootstrap, getEnv()]
  for (const file of middlewareDefinition.files) {
    const filePath = join(publish, file)
    const data = await fs.readFile(filePath, 'utf8')
    chunks.push('{', data, '}')
  }

  const middleware = await fs.readFile(join(publish, `server`, `${middlewareDefinition.name}.js`), 'utf8')

  chunks.push(middleware)

  const exports = /* js */ `export default _ENTRIES["middleware_${middlewareDefinition.name}"].default;`
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
}) => fs.copyFile(join(__dirname, '..', 'templates', 'edge', file), join(edgeFunctionDir, target ?? file))

// Edge functions don't support lookahead expressions
const stripLookahead = (regex: string) => regex.replace('^/(?!_next)', '^/')

/**
 * Writes Edge Functions for the Next middleware
 */
export const writeMiddleware = async (netlifyConfig: NetlifyConfig) => {
  const middlewareManifest = await loadMiddlewareManifest(netlifyConfig)
  if (!middlewareManifest) {
    console.error("Couldn't find the middleware manifest")
    return
  }

  const manifest: FunctionManifest = {
    functions: [],
    version: 1,
  }

  const edgeFunctionRoot = resolve('.netlify', 'edge-functions')
  await emptyDir(edgeFunctionRoot)

  await copyEdgeSourceFile({ edgeFunctionDir: edgeFunctionRoot, file: 'ipx.ts' })

  manifest.functions.push({
    function: 'ipx',
    path: '/_next/image*',
  })

  for (const middleware of middlewareManifest.sortedMiddleware) {
    const name = sanitizeName(middleware)
    const edgeFunctionDir = join(edgeFunctionRoot, name)
    const middlewareDefinition = middlewareManifest.middleware[middleware]
    const bundle = await getMiddlewareBundle({
      middlewareDefinition,
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
    manifest.functions.push({
      function: name,
      pattern: stripLookahead(middlewareDefinition.regexp),
    })
  }

  await writeJson(join(edgeFunctionRoot, 'manifest.json'), manifest)
}

export const updateConfig = async (publish: string) => {
  const configFile = join(publish, 'required-server-files.json')
  const config = await readJSON(configFile)
  config.config.env.NEXT_USE_NETLIFY_EDGE = 'true'
  await writeJSON(configFile, config)
}
