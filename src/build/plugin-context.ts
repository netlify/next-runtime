import { existsSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, relative, resolve } from 'node:path'
import { join as posixJoin } from 'node:path/posix'
import { fileURLToPath } from 'node:url'

import type {
  NetlifyPluginConstants,
  NetlifyPluginOptions,
  NetlifyPluginUtils,
} from '@netlify/build'
import type { PrerenderManifest, RoutesManifest } from 'next/dist/build/index.js'
import type { MiddlewareManifest } from 'next/dist/build/webpack/plugins/middleware-plugin.js'
import type { NextConfigComplete } from 'next/dist/server/config-shared.js'
import { satisfies } from 'semver'

const MODULE_DIR = fileURLToPath(new URL('.', import.meta.url))
const PLUGIN_DIR = join(MODULE_DIR, '../..')
const DEFAULT_PUBLISH_DIR = '.next'

export const SERVER_HANDLER_NAME = '___netlify-server-handler'
export const EDGE_HANDLER_NAME = '___netlify-edge-handler'

// copied from https://github.com/vercel/next.js/blob/af5b4db98ac1acccc3f167cc6aba2f0c9e7094df/packages/next/src/build/index.ts#L388-L395
// as this is not exported from the next.js package
export interface RequiredServerFilesManifest {
  version: number
  config: NextConfigComplete
  appDir: string
  relativeAppDir: string
  files: string[]
  ignore: string[]
}

export interface ExportDetail {
  success: boolean
  outDirectory: string
}

export class PluginContext {
  featureFlags: NetlifyPluginOptions['featureFlags']
  netlifyConfig: NetlifyPluginOptions['netlifyConfig']
  pluginName: string
  pluginVersion: string
  utils: NetlifyPluginUtils

  private constants: NetlifyPluginConstants
  private packageJSON: { name: string; version: string } & Record<string, unknown>

  /** Absolute path of the next runtime plugin directory */
  pluginDir = PLUGIN_DIR

  get relPublishDir(): string {
    return (
      this.constants.PUBLISH_DIR ?? join(this.constants.PACKAGE_PATH || '', DEFAULT_PUBLISH_DIR)
    )
  }

  /** Temporary directory for stashing the build output */
  get tempPublishDir(): string {
    return this.resolveFromPackagePath('.netlify/.next')
  }

  /** Absolute path of the publish directory */
  get publishDir(): string {
    // Does not need to be resolved with the package path as it is always a repository absolute path
    // hence including already the `PACKAGE_PATH` therefore we don't use the `this.resolveFromPackagePath`
    return resolve(this.relPublishDir)
  }

  /**
   * Relative package path in non monorepo setups this is an empty string
   * This path is provided by Next.js RequiredServerFiles manifest
   * @example ''
   * @example 'apps/my-app'
   */
  get relativeAppDir(): string {
    return this.requiredServerFiles.relativeAppDir ?? ''
  }

  /**
   * The working directory inside the lambda that is used for monorepos to execute the serverless function
   */
  get lambdaWorkingDirectory(): string {
    return join('/var/task', this.distDirParent)
  }

  /**
   * Retrieves the root of the `.next/standalone` directory
   */
  get standaloneRootDir(): string {
    return join(this.publishDir, 'standalone')
  }

  /**
   * The resolved relative next dist directory defaults to `.next`,
   * but can be configured through the next.config.js. For monorepos this will include the packagePath
   * If we need just the plain dist dir use the `nextDistDir`
   */
  get distDir(): string {
    const dir = this.buildConfig.distDir ?? DEFAULT_PUBLISH_DIR
    // resolve the distDir relative to the process working directory in case it contains '../../'
    return relative(process.cwd(), resolve(this.relativeAppDir, dir))
  }

  /** Represents the parent directory of the .next folder or custom distDir */
  get distDirParent(): string {
    // the .. is omitting the last part of the dist dir like `.next` but as it can be any custom folder
    // let's just move one directory up with that
    return join(this.distDir, '..')
  }

  /** The `.next` folder or what the custom dist dir is set to */
  get nextDistDir(): string {
    return relative(this.distDirParent, this.distDir)
  }

  /** Retrieves the `.next/standalone/` directory monorepo aware */
  get standaloneDir(): string {
    // the standalone directory mimics the structure of the publish directory
    // that said if the publish directory is `apps/my-app/.next` the standalone directory will be `.next/standalone/apps/my-app`
    // if the publish directory is .next the standalone directory will be `.next/standalone`
    // for nx workspaces where the publish directory is on the root of the repository
    // like `dist/apps/my-app/.next` the standalone directory will be `.next/standalone/dist/apps/my-app`
    return join(this.standaloneRootDir, this.distDirParent)
  }

  /**
   * Absolute path of the directory that is published and deployed to the Netlify CDN
   * Will be swapped with the publish directory
   * `.netlify/static`
   */
  get staticDir(): string {
    return this.resolveFromPackagePath('.netlify/static')
  }

  /**
   * Absolute path of the directory that will be deployed to the blob store
   * region aware: `.netlify/deploy/v1/blobs/deploy`
   * default: `.netlify/blobs/deploy`
   */
  get blobDir(): string {
    if (this.useRegionalBlobs) {
      return this.resolveFromPackagePath('.netlify/deploy/v1/blobs/deploy')
    }

    return this.resolveFromPackagePath('.netlify/blobs/deploy')
  }

  get buildVersion(): string {
    return this.constants.NETLIFY_BUILD_VERSION || 'v0.0.0'
  }

  get useRegionalBlobs(): boolean {
    // Region-aware blobs are only available as of CLI v17.23.5 (i.e. Build v29.41.5)
    const REQUIRED_BUILD_VERSION = '>=29.41.5'
    return satisfies(this.buildVersion, REQUIRED_BUILD_VERSION, { includePrerelease: true })
  }

  /**
   * Absolute path of the directory containing the files for the serverless lambda function
   * `.netlify/functions-internal`
   */
  get serverFunctionsDir(): string {
    return this.resolveFromPackagePath('.netlify/functions-internal')
  }

  /** Absolute path of the server handler */
  get serverHandlerRootDir(): string {
    return join(this.serverFunctionsDir, SERVER_HANDLER_NAME)
  }

  get serverHandlerDir(): string {
    if (this.relativeAppDir.length === 0) {
      return this.serverHandlerRootDir
    }
    return join(this.serverHandlerRootDir, this.distDirParent)
  }

  get serverHandlerRuntimeModulesDir(): string {
    return join(this.serverHandlerDir, '.netlify')
  }

  get nextServerHandler(): string {
    if (this.relativeAppDir.length !== 0) {
      return join(this.lambdaWorkingDirectory, '.netlify/dist/run/handlers/server.js')
    }
    return './.netlify/dist/run/handlers/server.js'
  }

  /**
   * Absolute path of the directory containing the files for deno edge functions
   * `.netlify/edge-functions`
   */
  get edgeFunctionsDir(): string {
    return this.resolveFromPackagePath('.netlify/edge-functions')
  }

  /** Absolute path of the edge handler */
  get edgeHandlerDir(): string {
    return join(this.edgeFunctionsDir, EDGE_HANDLER_NAME)
  }

  constructor(options: NetlifyPluginOptions) {
    this.constants = options.constants
    this.featureFlags = options.featureFlags
    this.netlifyConfig = options.netlifyConfig
    this.packageJSON = JSON.parse(readFileSync(join(PLUGIN_DIR, 'package.json'), 'utf-8'))
    this.pluginName = this.packageJSON.name
    this.pluginVersion = this.packageJSON.version
    this.utils = options.utils
  }

  /** Resolves a path correctly with mono repository awareness for .netlify directories mainly  */
  resolveFromPackagePath(...args: string[]): string {
    return resolve(this.constants.PACKAGE_PATH || '', ...args)
  }

  /** Resolves a path correctly from site directory */
  resolveFromSiteDir(...args: string[]): string {
    return resolve(this.requiredServerFiles.appDir, ...args)
  }

  /** Get the next prerender-manifest.json */
  async getPrerenderManifest(): Promise<PrerenderManifest> {
    return JSON.parse(await readFile(join(this.publishDir, 'prerender-manifest.json'), 'utf-8'))
  }

  /**
   * Uses various heuristics to try to find the .next dir.
   * Works by looking for BUILD_ID, so requires the site to have been built
   */
  findDotNext(): string | false {
    for (const dir of [
      // The publish directory
      this.publishDir,
      // In the root
      resolve(DEFAULT_PUBLISH_DIR),
      // The sibling of the publish directory
      resolve(this.publishDir, '..', DEFAULT_PUBLISH_DIR),
      // In the package dir
      resolve(this.constants.PACKAGE_PATH || '', DEFAULT_PUBLISH_DIR),
    ]) {
      if (existsSync(join(dir, 'BUILD_ID'))) {
        return dir
      }
    }
    return false
  }

  /**
   * Get Next.js middleware config from the build output
   */
  async getMiddlewareManifest(): Promise<MiddlewareManifest> {
    return JSON.parse(
      await readFile(join(this.publishDir, 'server/middleware-manifest.json'), 'utf-8'),
    )
  }

  // don't make private as it is handy inside testing to override the config
  _requiredServerFiles: RequiredServerFilesManifest | null = null

  /** Get RequiredServerFiles manifest from build output **/
  get requiredServerFiles(): RequiredServerFilesManifest {
    if (!this._requiredServerFiles) {
      let requiredServerFilesJson = join(this.publishDir, 'required-server-files.json')

      if (!existsSync(requiredServerFilesJson)) {
        const dotNext = this.findDotNext()
        if (dotNext) {
          requiredServerFilesJson = join(dotNext, 'required-server-files.json')
        }
      }

      this._requiredServerFiles = JSON.parse(
        readFileSync(requiredServerFilesJson, 'utf-8'),
      ) as RequiredServerFilesManifest
    }
    return this._requiredServerFiles
  }

  #exportDetail: ExportDetail | null = null

  /** Get metadata when output = export */
  get exportDetail(): ExportDetail | null {
    if (this.buildConfig.output !== 'export') {
      return null
    }
    if (!this.#exportDetail) {
      const detailFile = join(
        this.requiredServerFiles.appDir,
        this.buildConfig.distDir,
        'export-detail.json',
      )
      if (!existsSync(detailFile)) {
        return null
      }
      try {
        this.#exportDetail = JSON.parse(readFileSync(detailFile, 'utf-8'))
      } catch {}
    }
    return this.#exportDetail
  }

  /** Get Next Config from build output **/
  get buildConfig(): NextConfigComplete {
    return this.requiredServerFiles.config
  }

  /**
   * Get Next.js routes manifest from the build output
   */
  async getRoutesManifest(): Promise<RoutesManifest> {
    return JSON.parse(await readFile(join(this.publishDir, 'routes-manifest.json'), 'utf-8'))
  }

  #nextVersion: string | null | undefined = undefined

  /**
   * Get Next.js version that was used to build the site
   */
  get nextVersion(): string | null {
    if (this.#nextVersion === undefined) {
      try {
        const serverHandlerRequire = createRequire(posixJoin(this.standaloneRootDir, ':internal:'))
        const { version } = serverHandlerRequire('next/package.json')
        this.#nextVersion = version as string
      } catch {
        this.#nextVersion = null
      }
    }

    return this.#nextVersion
  }

  /** Fails a build with a message and an optional error */
  failBuild(message: string, error?: unknown): never {
    return this.utils.build.failBuild(message, error instanceof Error ? { error } : undefined)
  }
}
