import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
// Here we need to actually import `resolve` from node:path as we want to resolve the paths
// eslint-disable-next-line no-restricted-imports
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type {
  NetlifyPluginConstants,
  NetlifyPluginOptions,
  NetlifyPluginUtils,
} from '@netlify/build'
import type { PrerenderManifest, RoutesManifest } from 'next/dist/build/index.js'
import type { MiddlewareManifest } from 'next/dist/build/webpack/plugins/middleware-plugin.js'
import type { NextConfigComplete } from 'next/dist/server/config-shared.js'

const MODULE_DIR = fileURLToPath(new URL('.', import.meta.url))
const PLUGIN_DIR = join(MODULE_DIR, '../..')

export const SERVER_HANDLER_NAME = '___netlify-server-handler'
export const EDGE_HANDLER_NAME = '___netlify-edge-handler'

export type PageCacheValue = {
  kind: 'PAGE'
  html: string
  pageData: string
  headers?: { [k: string]: string }
  status?: number
}

export type RouteCacheValue = {
  kind: 'ROUTE'
  body: string
  headers: { [k: string]: string }
  status: number
}

export type FetchCacheValue = {
  kind: 'FETCH'
  data: {
    headers: { [k: string]: string }
    body: string
    url: string
    status?: number
    tags?: string[]
  }
}
export type CacheValue = PageCacheValue | RouteCacheValue | FetchCacheValue
export type CacheEntry = {
  lastModified: number
  value: CacheValue
}

export class PluginContext {
  utils: NetlifyPluginUtils
  netlifyConfig: NetlifyPluginOptions['netlifyConfig']
  pluginName: string
  pluginVersion: string

  private constants: NetlifyPluginConstants
  private packageJSON: { name: string; version: string } & Record<string, unknown>

  /** Absolute path of the next runtime plugin directory */
  pluginDir = PLUGIN_DIR

  /** Absolute path of the publish directory */
  get publishDir(): string {
    // Does not need to be resolved with the package path as it is always a repository absolute path
    // hence including already the `PACKAGE_PATH` therefore we don't use the `this.resolve`
    return resolve(this.constants.PUBLISH_DIR)
  }

  /**
   * Absolute path of the directory that is published and deployed to the Netlify CDN
   * Will be swapped with the publish directory
   * `.netlify/static`
   */
  get staticDir(): string {
    return this.resolve('.netlify/static')
  }

  /**
   * Absolute path of the directory that will be deployed to the blob store
   * `.netlify/blobs/deploy`
   */
  get blobDir(): string {
    return this.resolve('.netlify/blobs/deploy')
  }

  /**
   * Absolute path of the directory containing the files for the serverless lambda function
   * `.netlify/functions-internal`
   */
  get serverFunctionsDir(): string {
    return this.resolve('.netlify/functions-internal')
  }

  /** Absolute path of the server handler */
  get serverHandlerDir(): string {
    return join(this.serverFunctionsDir, SERVER_HANDLER_NAME)
  }

  /**
   * Absolute path of the directory containing the files for deno edge functions
   * `.netlify/edge-functions`
   */
  get edgeFunctionsDir(): string {
    return this.resolve('.netlify/edge-functions')
  }

  /** Absolute path of the edge handler */
  get edgeHandlerDir(): string {
    return join(this.edgeFunctionsDir, EDGE_HANDLER_NAME)
  }

  constructor(options: NetlifyPluginOptions) {
    this.packageJSON = JSON.parse(readFileSync(join(PLUGIN_DIR, 'package.json'), 'utf-8'))
    this.pluginName = this.packageJSON.name
    this.pluginVersion = this.packageJSON.version
    this.constants = options.constants
    this.utils = options.utils
    this.netlifyConfig = options.netlifyConfig
  }

  /** Resolves a path correctly with mono repository awareness  */
  resolve(...args: string[]): string {
    return resolve(this.constants.PACKAGE_PATH || '', ...args)
  }

  /** Get the next prerender-manifest.json */
  async getPrerenderManifest(): Promise<PrerenderManifest> {
    return JSON.parse(await readFile(join(this.publishDir, 'prerender-manifest.json'), 'utf-8'))
  }

  /**
   * Get Next.js middleware config from the build output
   */
  async getMiddlewareManifest(): Promise<MiddlewareManifest> {
    return JSON.parse(
      await readFile(join(this.publishDir, 'server/middleware-manifest.json'), 'utf-8'),
    )
  }

  /** Get Next Config from build output **/
  async getBuildConfig(): Promise<NextConfigComplete> {
    return JSON.parse(await readFile(join(this.publishDir, 'required-server-files.json'), 'utf-8'))
      .config
  }

  /**
   * Get Next.js routes manifest from the build output
   */
  async getRoutesManifest(): Promise<RoutesManifest> {
    return JSON.parse(await readFile(join(this.publishDir, 'routes-manifest.json'), 'utf-8'))
  }

  /**
   * Write a cache entry to the blob upload directory using
   * base64 keys to avoid collisions with directories
   */
  async writeCacheEntry(key: string, value: CacheValue): Promise<void> {
    const path = join(this.blobDir, Buffer.from(key).toString('base64'))
    const entry = JSON.stringify({
      lastModified: Date.now(),
      value,
    } satisfies CacheEntry)

    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, entry, 'utf-8')
  }

  /** Fails a build with a message and an optional error */
  failBuild(message: string, error?: unknown): never {
    return this.utils.build.failBuild(message, error instanceof Error ? { error } : undefined)
  }
}
