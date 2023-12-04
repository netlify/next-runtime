import { BlobsServer, type getStore } from '@netlify/blobs'
import { TestContext, assert, expect, vi } from 'vitest'

import type { NetlifyPluginConstants, NetlifyPluginOptions } from '@netlify/build'
import { bundle, serve } from '@netlify/edge-bundler'
import type { LambdaResponse } from '@netlify/serverless-functions-api/dist/lambda/response.js'
import { zipFunctions } from '@netlify/zip-it-and-ship-it'
import { execaCommand } from 'execa'
import getPort from 'get-port'
import { execute } from 'lambda-local'
import { existsSync } from 'node:fs'
import { cp, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  EDGE_FUNCTIONS_DIR,
  EDGE_HANDLER_NAME,
  SERVER_FUNCTIONS_DIR,
  SERVER_HANDLER_NAME,
} from '../../src/build/constants.js'
import { streamToString } from './stream-to-string.js'
import { inspect } from 'node:util'
import { v4 } from 'uuid'
import { glob } from 'fast-glob'

export interface FixtureTestContext extends TestContext {
  cwd: string
  siteID: string
  deployID: string
  blobStoreHost: string
  blobServer: BlobsServer
  blobStore: ReturnType<typeof getStore>
  functionDist: string
  edgeFunctionPort: number
  cleanup?: () => Promise<void>
}

export const BLOB_TOKEN = 'secret-token'

const bootstrapURL = 'https://edge.netlify.com/bootstrap/index-combined.ts'
const actualCwd = await vi.importActual<typeof import('process')>('process').then((p) => p.cwd())
const eszipHelper = join(actualCwd, 'tools/deno/eszip.ts')

function installDependencies(cwd: string) {
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) {
    return execaCommand('pnpm install --ignore-scripts --reporter=silent', {
      cwd,
    })
  }
  return execaCommand('npm install --ignore-scripts --no-audit --progress=false', { cwd })
}

/**
 * Copies a fixture to a temp folder on the system and runs the tests inside.
 * @param fixture name of the folder inside the fixtures folder
 */
export const createFixture = async (fixture: string, ctx: FixtureTestContext) => {
  ctx.cwd = await mkdtemp(join(tmpdir(), 'netlify-next-runtime-'))
  vi.spyOn(process, 'cwd').mockReturnValue(ctx.cwd)
  ctx.cleanup = async () => {
    try {
      await rm(ctx.cwd, { recursive: true, force: true })
    } catch {
      // noop
    }
  }

  try {
    const src = fileURLToPath(new URL(`../fixtures/${fixture}`, import.meta.url))
    const files = await glob('**/*', {
      cwd: src,
      dot: true,
      ignore: ['node_modules'],
    })

    await Promise.all(
      files.map((file) => cp(join(src, file), join(ctx.cwd, file), { recursive: true })),
    )

    await installDependencies(ctx.cwd)
  } catch (error) {
    throw new Error(`could not prepare the fixture: ${fixture}. ${error}`)
  }

  return { cwd: ctx.cwd }
}

export const createFsFixture = async (fixture: Record<string, string>, ctx: FixtureTestContext) => {
  ctx.cwd = await mkdtemp(join(tmpdir(), 'netlify-next-runtime-'))
  vi.spyOn(process, 'cwd').mockReturnValue(ctx.cwd)
  ctx.cleanup = async () => {
    try {
      await rm(ctx.cwd, { recursive: true, force: true })
    } catch {
      // noop
    }
  }

  try {
    await Promise.all(
      Object.entries(fixture).map(async ([key, value]) => {
        const filepath = join(ctx.cwd, key)
        await mkdir(dirname(filepath), { recursive: true })
        await writeFile(filepath, value, 'utf-8')
      }),
    )
  } catch (error) {
    throw new Error(`could not prepare the fixture from json ${error}`)
  }

  return { cwd: ctx.cwd }
}

/**
 * This method does basically two main parts
 * 1. Running the `onBuild` plugin with a set of defined constants
 * 2. Bundling the function up to an actual lambda function embedding the Netlify local parts
 * @param ctx The testing context
 * @param constants The build plugin constants that are passed down by `@netlify/build` to the plugin
 */
export async function runPlugin(
  ctx: FixtureTestContext,
  constants: Partial<NetlifyPluginConstants> = {},
) {
  const { onBuild } = await import('../../src/index.js')
  await onBuild({
    constants: {
      SITE_ID: ctx.siteID,
      NETLIFY_API_TOKEN: BLOB_TOKEN,
      NETLIFY_API_HOST: ctx.blobStoreHost,
      PUBLISH_DIR: join(ctx.cwd, '.next'),
      ...(constants || {}),
      // TODO: figure out if we need them
      // CONFIG_PATH: 'netlify.toml',
      // FUNCTIONS_DIST: '.netlify/functions/',
      // EDGE_FUNCTIONS_DIST: '.netlify/edge-functions-dist/',
      // CACHE_DIR: '.netlify/cache',
      // IS_LOCAL: true,
      // NETLIFY_BUILD_VERSION: '29.23.4',
      // INTERNAL_FUNCTIONS_SRC: '.netlify/functions-internal',
      // INTERNAL_EDGE_FUNCTIONS_SRC: '.netlify/edge-functions',
    },
    utils: {
      build: {
        failBuild: (message, options) => {
          assert.fail(`${message}: ${options?.error || ''}`)
        },
        failPlugin: (message, options) => {
          assert.fail(`${message}: ${options?.error || ''}`)
        },
        cancelBuild: (message, options) => {
          assert.fail(`${message}: ${options?.error || ''}`)
        },
      },
      cache: {
        save: vi.fn(),
      },
    },
  } as unknown as NetlifyPluginOptions)

  const internalSrcFolder = join(ctx.cwd, SERVER_FUNCTIONS_DIR)

  const bundleFunctions = async () => {
    if (!existsSync(internalSrcFolder)) {
      return
    }
    // create zip location in a new temp folder to avoid leaking node_modules through nodes resolve algorithm
    // that always looks up a parent directory for node_modules
    ctx.functionDist = await mkdtemp(join(tmpdir(), 'netlify-next-runtime-dist'))
    // bundle the function to get the bootstrap layer and all the important parts
    await zipFunctions([internalSrcFolder], ctx.functionDist, {
      basePath: ctx.cwd,
      manifest: join(ctx.functionDist, 'manifest.json'),
      repositoryRoot: ctx.cwd,
      configFileDirectories: [internalSrcFolder],
      internalSrcFolder,
      archiveFormat: 'none',
    })
  }

  const bundleEdgeFunctions = async () => {
    const dist = join(ctx.cwd, '.netlify', 'edge-functions-bundled')
    const edgeSource = join(ctx.cwd, EDGE_FUNCTIONS_DIR)

    if (!existsSync(edgeSource)) {
      return
    }

    const result = await bundle([edgeSource], dist, [], {
      bootstrapURL,
      internalSrcFolder: edgeSource,
      importMapPaths: [],
      basePath: ctx.cwd,
      configPath: join(edgeSource, 'manifest.json'),
    })
    const { asset } = result.manifest.bundles[0]
    const cmd = `deno run --allow-read --allow-write --allow-net --allow-env ${eszipHelper} extract ./${asset} .`
    await execaCommand(cmd, { cwd: dist })

    // start the edge functions server:
    const servePath = join(ctx.cwd, '.netlify', 'edge-functions-serve')
    ctx.edgeFunctionPort = await getPort()
    const server = await serve({
      basePath: ctx.cwd,
      bootstrapURL,
      port: ctx.edgeFunctionPort,
      importMapPaths: [],
      servePath: servePath,
      // debug: true,
      userLogger: console.log,
      featureFlags: {
        edge_functions_npm_modules: true,
      },
    })

    const { success, features } = await server(
      result.functions.map((fn) => ({
        name: fn.name,
        path: join(dist, 'source/root', relative(ctx.cwd, fn.path)),
      })),
    )
    expect(success).toBe(true)
  }

  await Promise.all([bundleEdgeFunctions(), bundleFunctions()])
}

/**
 * Execute the function with the provided parameters
 * @param ctx
 * @param options
 */
export async function invokeFunction(
  ctx: FixtureTestContext,
  options: {
    /**
     * The http method that is used for the invocation
     * @default 'GET'
     */
    httpMethod?: string
    /**
     * The relative path that should be requested
     * @default '/'
     */
    url?: string
    /** The headers used for the invocation*/
    headers?: Record<string, string>
    /** The body that is used for the invocation */
    body?: unknown
    /** Environment variables that should be set during the invocation */
    env?: Record<string, string | number>
  } = {},
) {
  const { httpMethod, headers, body, url, env } = options
  // now for the execution set the process working directory to the dist entry point
  vi.spyOn(process, 'cwd').mockReturnValue(join(ctx.functionDist, SERVER_HANDLER_NAME))
  const { handler } = await import(
    join(ctx.functionDist, SERVER_HANDLER_NAME, '___netlify-entry-point.mjs')
  )

  // The environment variables available during execution
  const environment = {
    NETLIFY_BLOBS_CONTEXT: Buffer.from(
      JSON.stringify({
        edgeURL: `http://${ctx.blobStoreHost}`,
        token: BLOB_TOKEN,
        siteID: ctx.siteID,
        deployID: ctx.deployID,
      }),
    ).toString('base64'),
    ...(env || {}),
  }
  const response = (await execute({
    event: {
      headers: headers || {},
      httpMethod: httpMethod || 'GET',
      rawUrl: new URL(url || '/', 'https://example.netlify').href,
    },
    environment,
    envdestroy: true,
    lambdaFunc: { handler },
    timeoutMs: 4_000,
  })) as LambdaResponse

  const responseHeaders = Object.entries(response.multiValueHeaders || {}).reduce(
    (prev, [key, value]) => ({
      ...prev,
      [key]: value.length === 1 ? `${value}` : value.join(', '),
    }),
    response.headers || {},
  )

  return {
    statusCode: response.statusCode,
    body: await streamToString(response.body),
    headers: responseHeaders,
    isBase64Encoded: response.isBase64Encoded,
  }
}

export async function invokeEdgeFunction(
  ctx: FixtureTestContext,
  options: {
    /** Array of functions to invoke */
    functions?: string[]
  } = {},
): Promise<Response> {
  const functionsToInvoke = options.functions || [EDGE_HANDLER_NAME]
  return await fetch(`http://0.0.0.0:${ctx.edgeFunctionPort}/`, {
    // Checkout the stargate headers: https://github.com/netlify/stargate/blob/dc8adfb6e91fa0a2fb00c0cba06e4e2f9e5d4e4d/proxy/deno/edge.go#L1142-L1170
    headers: {
      'x-nf-edge-functions': functionsToInvoke.join(','),
      'x-nf-deploy-id': ctx.deployID,
      'X-NF-Site-Info': Buffer.from(
        JSON.stringify({ id: ctx.siteID, name: 'Test Site', url: 'https://example.com' }),
      ).toString('base64'),
      'x-nf-blobs-info': Buffer.from(
        JSON.stringify({ url: `http://${ctx.blobStoreHost}`, token: BLOB_TOKEN }),
      ).toString('base64'),
      'x-NF-passthrough': 'passthrough',
      // 'x-NF-passthrough-host': 'passthrough', // TODO: add lambda local url
      'X-NF-Request-ID': v4(),
    },
  })
}
