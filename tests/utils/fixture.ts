import { BlobsServer } from '@netlify/blobs'
import { TestContext } from 'vitest'

import type { LambdaResponse } from '@netlify/serverless-functions-api/dist/lambda/response.js'
import { zipFunctions } from '@netlify/zip-it-and-ship-it'
import { execaCommand } from 'execa'
import { execute } from 'lambda-local'
import { cp, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vi } from 'vitest'
import { streamToString } from './stream-to-string.js'
import type { NetlifyPluginConstants, NetlifyPluginOptions } from '@netlify/build'

export interface FixtureTestContext extends TestContext {
  cwd: string
  siteID: string
  deployID: string
  blobStoreHost: string
  blobStore: BlobsServer
  cleanup?: () => Promise<void>
}

export const BLOB_TOKEN = 'secret-token'

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
    await cp(join(src, 'package.json'), join(ctx.cwd, 'package.json'), { recursive: true })
    await Promise.all([
      cp(join(src, '.next'), join(ctx.cwd, '.next'), { recursive: true }),
      execaCommand('npm install --ignore-scripts --no-audit --progress=false', {
        cwd: ctx.cwd,
        stdio: 'inherit',
      }),
    ])
  } catch (error) {
    throw new Error(`could not prepare the fixture: ${fixture}. ${error}`)
  }

  return { cwd: ctx.cwd }
}

/**
 * This method does basically three main parts that can be configured:
 * 1. Running the `onBuild` plugin with a set of defined constants
 * 2. Bundling the function up to an actual lambda function embedding the Netlify local parts
 * 3. Executing the function with the provided parameters
 * @param ctx
 * @param options
 */
export async function runPluginAndExecute(
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
    /** Additional constants or overrides that are used for the plugin execution */
    constants?: Partial<NetlifyPluginConstants>
  } = {},
) {
  const { constants, httpMethod, headers, body, url } = options
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
  } as unknown as NetlifyPluginOptions)

  // We need to do a dynamic import as we mock the `process.cwd()` inside the createFixture function
  // If we import it before calling that it will resolve to the actual process working directory instead of the mocked one
  const { SERVER_FUNCTIONS_DIR, SERVER_HANDLER_NAME } = await import(
    '../../src/helpers/constants.js'
  )

  const distFolder = join(ctx.cwd, 'function-dist')
  // bundle the function to get the bootstrap layer and all the important parts
  await zipFunctions(SERVER_FUNCTIONS_DIR, distFolder, {
    basePath: ctx.cwd,
    manifest: join(distFolder, 'manifest.json'),
    repositoryRoot: ctx.cwd,
    configFileDirectories: [SERVER_FUNCTIONS_DIR],
    internalSrcFolder: SERVER_FUNCTIONS_DIR,
    archiveFormat: 'none',
  })

  // now for the execution set the process working directory to the dist entry point
  vi.spyOn(process, 'cwd').mockReturnValue(join(distFolder, SERVER_HANDLER_NAME))
  const { handler } = await import(
    join(distFolder, SERVER_HANDLER_NAME, '___netlify-entry-point.mjs')
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
  }

  const response = (await execute({
    event: {
      headers: headers || {},
      httpMethod: httpMethod || 'GET',
      rawUrl: new URL(url || '/', 'https://example.netlify').href,
    },
    environment,
    lambdaFunc: { handler },
  })) as LambdaResponse

  return {
    statusCode: response.statusCode,
    body: await streamToString(response.body),
    headers: response.headers,
    isBase64Encoded: response.isBase64Encoded,
  }
}
