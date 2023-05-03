import os from 'os'
import path, { resolve } from 'path'
import process from 'process'

import type { NetlifyPluginOptions } from '@netlify/build'
import Chance from 'chance'
import { writeJSON, unlink, existsSync, readFileSync, ensureDir, readJson, pathExists, writeFile, move } from 'fs-extra'
import { join, relative } from 'pathe'
import { dir as getTmpDir } from 'tmp-promise'

// @ts-expect-error - TODO: Convert runtime export to ES6
// eslint-disable-next-line import/default
import nextRuntimeFactory from '../packages/runtime/src'
import { HANDLER_FUNCTION_NAME, ODB_FUNCTION_NAME, IMAGE_FUNCTION_NAME } from '../packages/runtime/src/constants'
import { watchForMiddlewareChanges } from '../packages/runtime/src/helpers/compiler'
import { getRequiredServerFiles, updateRequiredServerFiles } from '../packages/runtime/src/helpers/config'
import { getAllPageDependencies } from '../packages/runtime/src/templates/getPageResolver'

import { changeCwd, useFixture, moveNextDist } from './test-utils'

jest.mock('../packages/runtime/src/helpers/utils', () => ({
  ...jest.requireActual('../packages/runtime/src/helpers/utils'),
  isNextAuthInstalled: jest.fn(),
}))

jest.mock('../packages/runtime/src/helpers/functionsMetaData', () => {
  const { NEXT_PLUGIN_NAME } = require('../packages/runtime/src/constants')
  return {
    ...jest.requireActual('../packages/runtime/src/helpers/functionsMetaData'),
    getPluginVersion: async () => `${NEXT_PLUGIN_NAME}@1.0.0`,
  }
})
const nextRuntime = nextRuntimeFactory({})

const chance = new Chance()
const constants = {
  INTERNAL_FUNCTIONS_SRC: '.netlify/functions-internal',
  PUBLISH_DIR: '.next',
  FUNCTIONS_DIST: '.netlify/functions',
} as unknown as NetlifyPluginOptions['constants']
const utils = {
  build: {
    failBuild(message) {
      throw new Error(message)
    },
  },
  // eslint-disable-next-line no-void
  run: async () => void 0,
  cache: {
    save: jest.fn(),
    restore: jest.fn(),
  },
} as unknown as NetlifyPluginOptions['utils']

const normalizeChunkNames = (source) => source.replaceAll(/\/chunks\/\d+\.js/g, '/chunks/CHUNK_ID.js')

const onBuildHasRun = (netlifyConfig) =>
  Boolean(netlifyConfig.functions[HANDLER_FUNCTION_NAME]?.included_files?.some((file) => file.includes('BUILD_ID')))

const netlifyConfig = {
  build: { command: 'npm run build' },
  functions: {},
  redirects: [],
  headers: [],
} as NetlifyPluginOptions['netlifyConfig']
const defaultArgs = {
  netlifyConfig,
  utils,
  constants,
} as NetlifyPluginOptions

let restoreCwd
let cleanup

// In each test, we change cwd to a temporary directory.
// This allows us not to have to mock filesystem operations.
beforeEach(async () => {
  const tmpDir = await getTmpDir({ unsafeCleanup: true })
  restoreCwd = changeCwd(tmpDir.path)
  cleanup = tmpDir.cleanup

  netlifyConfig.build.publish = path.resolve('.next')
  netlifyConfig.build.environment = {}

  netlifyConfig.redirects = []
  netlifyConfig.headers = []
  for (const func of Object.values(netlifyConfig.functions)) {
    func.included_files = []
  }
  await useFixture('serverless_next_config')
})

afterEach(async () => {
  jest.clearAllMocks()
  jest.resetAllMocks()
  // Cleans up the temporary directory from `getTmpDir()` and do not make it
  // the current directory anymore
  restoreCwd()
  if (!process.env.TEST_SKIP_CLEANUP) {
    await cleanup()
  }
})

describe('preBuild()', () => {
  it('fails if publishing the root of the project', async () => {
    defaultArgs.netlifyConfig.build.publish = path.resolve('.')
    await expect(nextRuntime.onPreBuild(defaultArgs)).rejects.toThrow(
      /Your publish directory is pointing to the base directory of your site/,
    )
  })

  it('fails if the build version is too old', async () => {
    await expect(
      nextRuntime.onPreBuild({
        ...defaultArgs,
        constants: { IS_LOCAL: true, NETLIFY_BUILD_VERSION: '18.15.0' },
      }),
    ).rejects.toThrow('This version of the Next Runtime requires netlify-cli')
  })

  it('passes if the build version is new enough', async () => {
    await expect(
      nextRuntime.onPreBuild({
        ...defaultArgs,
        constants: { IS_LOCAL: true, NETLIFY_BUILD_VERSION: '18.16.1' },
      }),
    ).resolves.not.toThrow()
  })

  it('restores cache with right paths', async () => {
    await useFixture('dist_dir_next_config')

    const restore = jest.fn()

    await nextRuntime.onPreBuild({
      ...defaultArgs,
      utils: { ...utils, cache: { restore } },
    })

    expect(restore).toHaveBeenCalledWith(path.resolve('.next/cache'))
  })

  it('forces the target to "server"', async () => {
    const netlifyConfig = { ...defaultArgs.netlifyConfig }

    await nextRuntime.onPreBuild({ ...defaultArgs, netlifyConfig })
    expect(netlifyConfig.build.environment.NEXT_PRIVATE_TARGET).toBe('server')
  })
})

describe('onBuild()', () => {
  const { isNextAuthInstalled } = require('../packages/runtime/src/helpers/utils')

  beforeEach(() => {
    isNextAuthInstalled.mockImplementation(() => true)
  })

  afterEach(() => {
    delete process.env.DEPLOY_PRIME_URL
    delete process.env.URL
    delete process.env.CONTEXT
  })

  it('does not set NEXTAUTH_URL if value is already set', async () => {
    const mockUserDefinedSiteUrl = chance.url()
    process.env.DEPLOY_PRIME_URL = chance.url()

    await moveNextDist()

    const initialConfig = await getRequiredServerFiles(netlifyConfig.build.publish)

    initialConfig.config.env.NEXTAUTH_URL = mockUserDefinedSiteUrl
    await updateRequiredServerFiles(netlifyConfig.build.publish, initialConfig)

    await nextRuntime.onBuild(defaultArgs)

    expect(onBuildHasRun(netlifyConfig)).toBe(true)
    const config = await getRequiredServerFiles(netlifyConfig.build.publish)

    expect(config.config.env.NEXTAUTH_URL).toEqual(mockUserDefinedSiteUrl)
  })

  it("sets the NEXTAUTH_URL to the DEPLOY_PRIME_URL when CONTEXT env variable is not 'production'", async () => {
    const mockUserDefinedSiteUrl = chance.url()
    process.env.DEPLOY_PRIME_URL = mockUserDefinedSiteUrl
    process.env.URL = chance.url()

    // See https://docs.netlify.com/configure-builds/environment-variables/#build-metadata for all possible values
    process.env.CONTEXT = 'deploy-preview'

    await moveNextDist()

    const initialConfig = await getRequiredServerFiles(netlifyConfig.build.publish)

    initialConfig.config.env.NEXTAUTH_URL = mockUserDefinedSiteUrl
    await updateRequiredServerFiles(netlifyConfig.build.publish, initialConfig)

    await nextRuntime.onBuild(defaultArgs)

    expect(onBuildHasRun(netlifyConfig)).toBe(true)
    const config = await getRequiredServerFiles(netlifyConfig.build.publish)

    expect(config.config.env.NEXTAUTH_URL).toEqual(mockUserDefinedSiteUrl)
  })

  it("sets the NEXTAUTH_URL to the user defined site URL when CONTEXT env variable is 'production'", async () => {
    const mockUserDefinedSiteUrl = chance.url()
    process.env.DEPLOY_PRIME_URL = chance.url()
    process.env.URL = mockUserDefinedSiteUrl

    // See https://docs.netlify.com/configure-builds/environment-variables/#build-metadata for all possible values
    process.env.CONTEXT = 'production'

    await moveNextDist()

    const initialConfig = await getRequiredServerFiles(netlifyConfig.build.publish)

    initialConfig.config.env.NEXTAUTH_URL = mockUserDefinedSiteUrl
    await updateRequiredServerFiles(netlifyConfig.build.publish, initialConfig)

    await nextRuntime.onBuild(defaultArgs)

    expect(onBuildHasRun(netlifyConfig)).toBe(true)
    const config = await getRequiredServerFiles(netlifyConfig.build.publish)

    expect(config.config.env.NEXTAUTH_URL).toEqual(mockUserDefinedSiteUrl)
  })

  it('sets the NEXTAUTH_URL specified in the netlify.toml or in the Netlify UI', async () => {
    const mockSiteUrl = chance.url()
    process.env.NEXTAUTH_URL = mockSiteUrl

    await moveNextDist()

    await nextRuntime.onBuild(defaultArgs)

    expect(onBuildHasRun(netlifyConfig)).toBe(true)
    const config = await getRequiredServerFiles(netlifyConfig.build.publish)

    expect(config.config.env.NEXTAUTH_URL).toEqual(mockSiteUrl)
    delete process.env.NEXTAUTH_URL
  })

  it('sets NEXTAUTH_URL when next-auth package is detected', async () => {
    const mockSiteUrl = chance.url()

    // Value represents the main address to the site and is either
    // a Netlify subdomain or custom domain set by the user.
    // See https://docs.netlify.com/configure-builds/environment-variables/#deploy-urls-and-metadata
    process.env.DEPLOY_PRIME_URL = mockSiteUrl

    await moveNextDist()

    await nextRuntime.onBuild(defaultArgs)

    expect(onBuildHasRun(netlifyConfig)).toBe(true)
    const config = await getRequiredServerFiles(netlifyConfig.build.publish)

    expect(config.config.env.NEXTAUTH_URL).toEqual(mockSiteUrl)
  })

  it('includes the basePath on NEXTAUTH_URL when present', async () => {
    const mockSiteUrl = chance.url()
    process.env.DEPLOY_PRIME_URL = mockSiteUrl

    await moveNextDist()

    const initialConfig = await getRequiredServerFiles(netlifyConfig.build.publish)
    initialConfig.config.basePath = '/foo'
    await updateRequiredServerFiles(netlifyConfig.build.publish, initialConfig)

    await nextRuntime.onBuild(defaultArgs)

    expect(onBuildHasRun(netlifyConfig)).toBe(true)
    const config = await getRequiredServerFiles(netlifyConfig.build.publish)

    expect(config.config.env.NEXTAUTH_URL).toEqual(`${mockSiteUrl}/foo`)
  })

  it('skips setting NEXTAUTH_URL when next-auth package is not found', async () => {
    isNextAuthInstalled.mockImplementation(() => false)

    await moveNextDist()
    await nextRuntime.onBuild(defaultArgs)

    expect(onBuildHasRun(netlifyConfig)).toBe(true)
    const config = await getRequiredServerFiles(netlifyConfig.build.publish)

    expect(config.config.env.NEXTAUTH_URL).toBeUndefined()
  })

  it('runs onBuild', async () => {
    await moveNextDist()

    await nextRuntime.onBuild(defaultArgs)

    expect(onBuildHasRun(netlifyConfig)).toBe(true)
  })

  it('skips if NETLIFY_NEXT_PLUGIN_SKIP is set', async () => {
    process.env.NETLIFY_NEXT_PLUGIN_SKIP = 'true'
    await moveNextDist()
    await nextRuntime.onBuild(defaultArgs)

    expect(onBuildHasRun(netlifyConfig)).toBe(false)
    delete process.env.NETLIFY_NEXT_PLUGIN_SKIP
  })

  it('skips if NEXT_PLUGIN_FORCE_RUN is "false"', async () => {
    process.env.NEXT_PLUGIN_FORCE_RUN = 'false'
    await moveNextDist()
    await nextRuntime.onBuild(defaultArgs)

    expect(onBuildHasRun(netlifyConfig)).toBe(false)
    delete process.env.NEXT_PLUGIN_FORCE_RUN
  })

  it("fails if BUILD_ID doesn't exist", async () => {
    await moveNextDist()
    await unlink(path.join(process.cwd(), '.next/BUILD_ID'))
    const failBuild = jest.fn().mockImplementation((err) => {
      throw new Error(err)
    })
    await expect(() =>
      nextRuntime.onBuild({ ...defaultArgs, utils: { ...utils, build: { failBuild } } }),
    ).rejects.toThrow(
      `In most cases it should be set to ".next", unless you have chosen a custom "distDir" in your Next config.`,
    )
    expect(failBuild).toHaveBeenCalled()
  })

  it("fails with helpful warning if BUILD_ID doesn't exist and publish is 'out'", async () => {
    await moveNextDist()
    await unlink(path.join(process.cwd(), '.next/BUILD_ID'))
    const failBuild = jest.fn().mockImplementation((err) => {
      throw new Error(err)
    })
    netlifyConfig.build.publish = path.resolve('out')

    await expect(() =>
      nextRuntime.onBuild({ ...defaultArgs, utils: { ...utils, build: { failBuild } } }),
    ).rejects.toThrow(`Your publish directory is set to "out", but in most cases it should be ".next".`)
    expect(failBuild).toHaveBeenCalled()
  })

  it('fails build if next export has run', async () => {
    await moveNextDist()
    await writeJSON(path.join(process.cwd(), '.next/export-detail.json'), {})
    const failBuild = jest.fn()
    await nextRuntime.onBuild({ ...defaultArgs, utils: { ...utils, build: { failBuild } } })
    expect(failBuild).toHaveBeenCalled()
  })

  it('copy handlers to the internal functions directory', async () => {
    await moveNextDist()

    await nextRuntime.onBuild(defaultArgs)

    expect(existsSync(`.netlify/functions-internal/___netlify-handler/___netlify-handler.js`)).toBeTruthy()
    expect(existsSync(`.netlify/functions-internal/___netlify-handler/bridge.js`)).toBeTruthy()
    expect(existsSync(`.netlify/functions-internal/___netlify-handler/handlerUtils.js`)).toBeTruthy()
    expect(existsSync(`.netlify/functions-internal/___netlify-odb-handler/___netlify-odb-handler.js`)).toBeTruthy()
    expect(existsSync(`.netlify/functions-internal/___netlify-odb-handler/bridge.js`)).toBeTruthy()
    expect(existsSync(`.netlify/functions-internal/___netlify-odb-handler/handlerUtils.js`)).toBeTruthy()
  })

  it('writes correct redirects to netlifyConfig', async () => {
    await moveNextDist()

    await nextRuntime.onBuild(defaultArgs)
    // Not ideal, because it doesn't test precedence, but unfortunately the exact order seems to
    // be non-deterministic, as it depends on filesystem globbing across platforms.
    const sorted = [...netlifyConfig.redirects].sort((a, b) => a.from.localeCompare(b.from))
    expect(sorted).toMatchSnapshot()
  })

  it('publish dir is/has next dist', async () => {
    await moveNextDist()

    await nextRuntime.onBuild(defaultArgs)
    expect(existsSync(path.resolve('.next/BUILD_ID'))).toBeTruthy()
  })

  it('generates static files manifest', async () => {
    await moveNextDist()
    await nextRuntime.onBuild(defaultArgs)
    const manifestPath = path.resolve('.next/static-manifest.json')
    expect(existsSync(manifestPath)).toBeTruthy()
    const data = (await readJson(manifestPath)).sort()
    expect(data).toMatchSnapshot()
  })

  it('moves static files to root', async () => {
    await moveNextDist()
    await nextRuntime.onBuild(defaultArgs)
    const data = JSON.parse(readFileSync(path.resolve('.next/static-manifest.json'), 'utf8'))
    data.forEach(([_, file]) => {
      expect(existsSync(path.resolve(path.join('.next', file)))).toBeTruthy()
      expect(existsSync(path.resolve(path.join('.next', 'server', 'pages', file)))).toBeFalsy()
    })
  })

  it('copies default locale files to top level', async () => {
    await moveNextDist()
    await nextRuntime.onBuild(defaultArgs)
    const data = JSON.parse(readFileSync(path.resolve('.next/static-manifest.json'), 'utf8'))

    const locale = 'en/'

    data.forEach(([_, file]) => {
      if (!file.startsWith(locale)) {
        return
      }
      const trimmed = file.slice(locale.length)
      expect(existsSync(path.resolve(path.join('.next', trimmed)))).toBeTruthy()
    })
  })

  // TODO - TO BE MOVED TO TEST AGAINST A PROJECT WITH MIDDLEWARE IN ANOTHER PR
  it.skip('skips static files that match middleware', async () => {
    await moveNextDist()
    await nextRuntime.onBuild(defaultArgs)

    expect(existsSync(path.resolve(path.join('.next', 'en', 'middle.html')))).toBeFalsy()
    expect(existsSync(path.resolve(path.join('.next', 'server', 'pages', 'en', 'middle.html')))).toBeTruthy()
  })

  it('sets correct config', async () => {
    await moveNextDist()

    await nextRuntime.onBuild(defaultArgs)
    const includes = [
      '.env',
      '.env.local',
      '.env.production',
      '.env.production.local',
      './public/locales/**',
      './next-i18next.config.js',
      '.next/server/**',
      '.next/serverless/**',
      '.next/*.json',
      '.next/BUILD_ID',
      '.next/static/chunks/webpack-middleware*.js',
      '!.next/server/**/*.js.nft.json',
      '!.next/server/**/*.map',
      '!**/node_modules/@next/swc*/**/*',
      '!../../node_modules/next/dist/compiled/@ampproject/toolbox-optimizer/**/*',
      `!node_modules/next/dist/server/lib/squoosh/**/*.wasm`,
      `!node_modules/next/dist/next-server/server/lib/squoosh/**/*.wasm`,
      '!node_modules/next/dist/compiled/webpack/bundle4.js',
      '!node_modules/next/dist/compiled/webpack/bundle5.js',
      '!node_modules/sharp/**/*',
    ]
    // Relative paths in Windows are different
    if (os.platform() !== 'win32') {
      expect(netlifyConfig.functions[HANDLER_FUNCTION_NAME].included_files).toEqual(includes)
      expect(netlifyConfig.functions[ODB_FUNCTION_NAME].included_files).toEqual(includes)
    }
    expect(netlifyConfig.functions[HANDLER_FUNCTION_NAME].node_bundler).toEqual('nft')
    expect(netlifyConfig.functions[ODB_FUNCTION_NAME].node_bundler).toEqual('nft')
  })

  const excludesSharp = (includedFiles) => includedFiles.some((file) => file.startsWith('!') && file.includes('sharp'))

  it("doesn't exclude sharp if manually included", async () => {
    await moveNextDist()

    const functions = [HANDLER_FUNCTION_NAME, ODB_FUNCTION_NAME]

    await nextRuntime.onBuild(defaultArgs)

    // Should exclude by default
    for (const func of functions) {
      expect(excludesSharp(netlifyConfig.functions[func].included_files)).toBeTruthy()
    }

    // ...but if the user has added it, we shouldn't exclude it
    for (const func of functions) {
      netlifyConfig.functions[func].included_files = ['node_modules/sharp/**/*']
    }

    await nextRuntime.onBuild(defaultArgs)

    for (const func of functions) {
      expect(excludesSharp(netlifyConfig.functions[func].included_files)).toBeFalsy()
    }

    // ...even if it's in a subdirectory
    for (const func of functions) {
      netlifyConfig.functions[func].included_files = ['subdirectory/node_modules/sharp/**/*']
    }

    await nextRuntime.onBuild(defaultArgs)

    for (const func of functions) {
      expect(excludesSharp(netlifyConfig.functions[func].included_files)).toBeFalsy()
    }
  })

  it('generates a file referencing all API route sources', async () => {
    await moveNextDist()
    await nextRuntime.onBuild(defaultArgs)

    for (const route of ['_api_hello-background-background', '_api_hello-scheduled-handler']) {
      const expected = path.resolve(constants.INTERNAL_FUNCTIONS_SRC, route, 'pages.js')
      expect(existsSync(expected)).toBeTruthy()
      expect(normalizeChunkNames(readFileSync(expected, 'utf8'))).toMatchSnapshot(`for ${route}`)
    }
  })

  it('generates a file referencing all page sources', async () => {
    await moveNextDist()
    await nextRuntime.onBuild(defaultArgs)
    const handlerPagesFile = path.join(constants.INTERNAL_FUNCTIONS_SRC, HANDLER_FUNCTION_NAME, 'pages.js')
    const odbHandlerPagesFile = path.join(constants.INTERNAL_FUNCTIONS_SRC, ODB_FUNCTION_NAME, 'pages.js')
    expect(existsSync(handlerPagesFile)).toBeTruthy()
    expect(existsSync(odbHandlerPagesFile)).toBeTruthy()

    expect(normalizeChunkNames(readFileSync(handlerPagesFile, 'utf8'))).toMatchSnapshot()
    expect(normalizeChunkNames(readFileSync(odbHandlerPagesFile, 'utf8'))).toMatchSnapshot()
  })

  it('generates a file referencing all when publish dir is a subdirectory', async () => {
    const dir = 'web/.next'
    await moveNextDist(dir)

    netlifyConfig.build.publish = path.resolve(dir)
    const config = {
      ...defaultArgs,
      netlifyConfig,
      constants: { ...constants, PUBLISH_DIR: dir },
    }
    await nextRuntime.onBuild(config)
    const handlerPagesFile = path.join(constants.INTERNAL_FUNCTIONS_SRC, HANDLER_FUNCTION_NAME, 'pages.js')
    const odbHandlerPagesFile = path.join(constants.INTERNAL_FUNCTIONS_SRC, ODB_FUNCTION_NAME, 'pages.js')

    expect(normalizeChunkNames(readFileSync(handlerPagesFile, 'utf8'))).toMatchSnapshot()
    expect(normalizeChunkNames(readFileSync(odbHandlerPagesFile, 'utf8'))).toMatchSnapshot()
  })

  it('generates entrypoints with correct references', async () => {
    await moveNextDist()
    await nextRuntime.onBuild(defaultArgs)

    const handlerFile = path.join(
      constants.INTERNAL_FUNCTIONS_SRC,
      HANDLER_FUNCTION_NAME,
      `${HANDLER_FUNCTION_NAME}.js`,
    )
    const odbHandlerFile = path.join(constants.INTERNAL_FUNCTIONS_SRC, ODB_FUNCTION_NAME, `${ODB_FUNCTION_NAME}.js`)
    expect(existsSync(handlerFile)).toBeTruthy()
    expect(existsSync(odbHandlerFile)).toBeTruthy()

    expect(readFileSync(handlerFile, 'utf8')).toMatch(`(config, "../../..", pageRoot, staticManifest, 'ssr')`)
    expect(readFileSync(odbHandlerFile, 'utf8')).toMatch(`(config, "../../..", pageRoot, staticManifest, 'odb')`)
    expect(readFileSync(handlerFile, 'utf8')).toMatch(`require("../../../.next/required-server-files.json")`)
    expect(readFileSync(odbHandlerFile, 'utf8')).toMatch(`require("../../../.next/required-server-files.json")`)
  })

  it('handles empty routesManifest.staticRoutes', async () => {
    await moveNextDist()
    const manifestPath = path.resolve('.next/routes-manifest.json')
    const routesManifest = await readJson(manifestPath)
    delete routesManifest.staticRoutes
    await writeJSON(manifestPath, routesManifest)
    // The function is supposed to return undefined, but we want to check if it throws
    expect(await nextRuntime.onBuild(defaultArgs)).toBeUndefined()
  })

  it('generates imageconfig file with entries for domains, remotePatterns, and custom response headers', async () => {
    await moveNextDist()
    const mockHeaderValue = chance.string()

    const updatedArgs = {
      ...defaultArgs,
      netlifyConfig: {
        ...defaultArgs.netlifyConfig,
        headers: [
          {
            for: '/_next/image/',
            values: {
              'X-Foo': mockHeaderValue,
            },
          },
        ],
      },
    }
    await nextRuntime.onBuild(updatedArgs)

    const imageConfigPath = path.join(constants.INTERNAL_FUNCTIONS_SRC, IMAGE_FUNCTION_NAME, 'imageconfig.json')
    const imageConfigJson = await readJson(imageConfigPath)

    expect(imageConfigJson.domains.length).toBe(1)
    expect(imageConfigJson.remotePatterns.length).toBe(1)
    expect(imageConfigJson.responseHeaders).toStrictEqual({
      'X-Foo': mockHeaderValue,
    })
  })

  it('generates an ipx function by default', async () => {
    await moveNextDist()
    await nextRuntime.onBuild(defaultArgs)
    expect(existsSync(path.join('.netlify', 'functions-internal', '_ipx', '_ipx.js'))).toBeTruthy()
  })

  // Enabled while edge images are off by default
  it('does not generate an ipx edge function by default', async () => {
    await moveNextDist()
    await nextRuntime.onBuild(defaultArgs)
    expect(existsSync(path.join('.netlify', 'edge-functions', 'ipx', 'index.ts'))).toBeFalsy()
  })

  it('generates an ipx edge function if force is set', async () => {
    process.env.NEXT_FORCE_EDGE_IMAGES = '1'
    await moveNextDist()
    await nextRuntime.onBuild(defaultArgs)
    expect(existsSync(path.join('.netlify', 'edge-functions', 'ipx', 'index.ts'))).toBeTruthy()
  })

  it('generates edge-functions manifest', async () => {
    await moveNextDist()
    await nextRuntime.onBuild(defaultArgs)
    expect(existsSync(path.join('.netlify', 'edge-functions', 'manifest.json'))).toBeTruthy()
  })

  it('generates generator field within the edge-functions manifest', async () => {
    await moveNextDist()
    await nextRuntime.onBuild(defaultArgs)
    const manifestPath = await readJson(path.resolve('.netlify/edge-functions/manifest.json'))
    const manifest = manifestPath.functions

    expect(manifest).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          generator: '@netlify/next-runtime@1.0.0',
        }),
      ]),
    )
  })

  it('generates generator field within the edge-functions manifest includes IPX', async () => {
    process.env.NEXT_FORCE_EDGE_IMAGES = '1'
    await moveNextDist()
    await nextRuntime.onBuild(defaultArgs)
    const manifestPath = await readJson(path.resolve('.netlify/edge-functions/manifest.json'))
    const manifest = manifestPath.functions

    expect(manifest).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          generator: '@netlify/next-runtime@1.0.0',
        }),
      ]),
    )
  })

  it('does not generate an ipx function when DISABLE_IPX is set', async () => {
    process.env.DISABLE_IPX = '1'
    await moveNextDist()
    await nextRuntime.onBuild(defaultArgs)
    expect(existsSync(path.join('.netlify', 'functions-internal', '_ipx', '_ipx.js'))).toBeFalsy()
    delete process.env.DISABLE_IPX
  })

  it('creates 404 redirect when DISABLE_IPX is set', async () => {
    process.env.DISABLE_IPX = '1'
    await moveNextDist()
    await nextRuntime.onBuild(defaultArgs)
    const nextImageRedirect = netlifyConfig.redirects.find((redirect) => redirect.from.includes('/_next/image'))

    expect(nextImageRedirect).toBeDefined()
    expect(nextImageRedirect.to).toEqual('/404.html')
    expect(nextImageRedirect.status).toEqual(404)
    expect(nextImageRedirect.force).toEqual(true)

    delete process.env.DISABLE_IPX
  })

  it('generates an ipx edge function by default', async () => {
    await moveNextDist()
    await nextRuntime.onBuild(defaultArgs)
    expect(existsSync(path.join('.netlify', 'edge-functions', 'ipx', 'index.ts'))).toBeTruthy()
  })

  it('does not generate an ipx edge function if the feature is disabled', async () => {
    process.env.NEXT_DISABLE_EDGE_IMAGES = '1'
    await moveNextDist()
    await nextRuntime.onBuild(defaultArgs)
    expect(existsSync(path.join('.netlify', 'edge-functions', 'ipx', 'index.ts'))).toBeFalsy()
    delete process.env.NEXT_DISABLE_EDGE_IMAGES
  })

  it('does not generate an ipx edge function if Netlify Edge is disabled', async () => {
    process.env.NEXT_DISABLE_NETLIFY_EDGE = '1'
    await moveNextDist()

    // We need to pretend there's no edge API routes, because otherwise it'll fail
    // when we try to disable edge runtime.
    const manifest = path.join('.next', 'server', 'middleware-manifest.json')
    const manifestContent = await readJson(manifest)
    manifestContent.functions = {}
    await writeJSON(manifest, manifestContent)

    await nextRuntime.onBuild(defaultArgs)

    expect(existsSync(path.join('.netlify', 'edge-functions', 'ipx', 'index.ts'))).toBeFalsy()
    delete process.env.NEXT_DISABLE_NETLIFY_EDGE
  })

  it('moves static files to a subdirectory if basePath is set', async () => {
    await moveNextDist()

    const initialConfig = await getRequiredServerFiles(netlifyConfig.build.publish)

    initialConfig.config.basePath = '/docs'

    await updateRequiredServerFiles(netlifyConfig.build.publish, initialConfig)

    await nextRuntime.onBuild(defaultArgs)

    expect(onBuildHasRun(netlifyConfig)).toBe(true)
    const publicFile = path.join(netlifyConfig.build.publish, 'docs', 'shows1.json')
    expect(existsSync(publicFile)).toBe(true)
    expect(await readJson(publicFile)).toMatchObject(expect.any(Array))
  })
})

describe('onPostBuild', () => {
  it('saves cache with right paths', async () => {
    await moveNextDist()

    const save = jest.fn()

    await nextRuntime.onPostBuild({
      ...defaultArgs,
      utils: { ...utils, cache: { save }, functions: { list: jest.fn().mockResolvedValue([]) } },
    })

    expect(save).toHaveBeenCalledWith(path.resolve('.next/cache'))
  })

  it('warns if old functions exist', async () => {
    await moveNextDist()

    const list = jest.fn().mockResolvedValue([
      {
        name: 'next_test',
        mainFile: join(constants.INTERNAL_FUNCTIONS_SRC, 'next_test', 'next_test.js'),
        runtime: 'js',
        extension: '.js',
      },
      {
        name: 'next_demo',
        mainFile: join(constants.INTERNAL_FUNCTIONS_SRC, 'next_demo', 'next_demo.js'),
        runtime: 'js',
        extension: '.js',
      },
    ])

    const oldLog = console.log
    const logMock = jest.fn()
    console.log = logMock
    await nextRuntime.onPostBuild({
      ...defaultArgs,

      utils: { ...utils, cache: { save: jest.fn() }, functions: { list } },
    })

    expect(logMock).toHaveBeenCalledWith(
      expect.stringContaining(
        `We have found the following functions in your site that seem to be left over from the old Next.js plugin (v3). We have guessed this because the name starts with "next_".`,
      ),
    )

    console.log = oldLog
  })

  it('warns if NETLIFY_NEXT_PLUGIN_SKIP is set', async () => {
    await moveNextDist()

    process.env.NETLIFY_NEXT_PLUGIN_SKIP = 'true'
    await moveNextDist()
    const show = jest.fn()
    await nextRuntime.onPostBuild({ ...defaultArgs, utils: { ...defaultArgs.utils, status: { show } } })
    expect(show).toHaveBeenCalledWith({
      summary: 'Next cache was stored, but all other functions were skipped because NETLIFY_NEXT_PLUGIN_SKIP is set',
      title: 'Next Runtime did not run',
    })
    delete process.env.NETLIFY_NEXT_PLUGIN_SKIP
  })

  it('warns if NEXT_PLUGIN_FORCE_RUN is "false"', async () => {
    await moveNextDist()

    process.env.NEXT_PLUGIN_FORCE_RUN = 'false'
    await moveNextDist()
    const show = jest.fn()
    await nextRuntime.onPostBuild({ ...defaultArgs, utils: { ...defaultArgs.utils, status: { show } } })
    expect(show).toHaveBeenCalledWith({
      summary:
        'Next cache was stored, but all other functions were skipped because NEXT_PLUGIN_FORCE_RUN is set to false',
      title: 'Next Runtime did not run',
    })
    delete process.env.NEXT_PLUGIN_FORCE_RUN
  })

  it('adds headers to Netlify configuration', async () => {
    await moveNextDist()

    const show = jest.fn()

    await nextRuntime.onPostBuild({
      ...defaultArgs,

      utils: { ...defaultArgs.utils, status: { show }, functions: { list: jest.fn().mockResolvedValue([]) } },
    })

    expect(netlifyConfig.headers).toEqual([
      {
        for: '/',
        values: {
          'x-custom-header': 'my custom header value',
        },
      },
      {
        for: '/en/',
        values: {
          'x-custom-header': 'my custom header value',
        },
      },
      {
        for: '/es/',
        values: {
          'x-custom-header': 'my custom header value',
        },
      },
      {
        for: '/fr/',
        values: {
          'x-custom-header': 'my custom header value',
        },
      },
      {
        for: '/api/*',
        values: {
          'x-custom-api-header': 'my custom api header value',
        },
      },
      {
        for: '/en/api/*',
        values: {
          'x-custom-api-header': 'my custom api header value',
        },
      },
      {
        for: '/es/api/*',
        values: {
          'x-custom-api-header': 'my custom api header value',
        },
      },
      {
        for: '/fr/api/*',
        values: {
          'x-custom-api-header': 'my custom api header value',
        },
      },
      {
        for: '/*',
        values: {
          'x-custom-header-for-everything': 'my custom header for everything value',
        },
      },
      {
        for: '/en/*',
        values: {
          'x-custom-header-for-everything': 'my custom header for everything value',
        },
      },
      {
        for: '/es/*',
        values: {
          'x-custom-header-for-everything': 'my custom header for everything value',
        },
      },
      {
        for: '/fr/*',
        values: {
          'x-custom-header-for-everything': 'my custom header for everything value',
        },
      },
    ])
  })

  it('appends headers to existing headers in the Netlify configuration', async () => {
    await moveNextDist()

    netlifyConfig.headers = [
      {
        for: '/',
        values: {
          'x-existing-header-in-configuration': 'existing header in configuration value',
        },
      },
    ]

    const show = jest.fn()

    await nextRuntime.onPostBuild({
      ...defaultArgs,

      utils: { ...defaultArgs.utils, status: { show }, functions: { list: jest.fn().mockResolvedValue([]) } },
    })

    expect(netlifyConfig.headers).toEqual([
      {
        for: '/',
        values: {
          'x-existing-header-in-configuration': 'existing header in configuration value',
        },
      },
      {
        for: '/',
        values: {
          'x-custom-header': 'my custom header value',
        },
      },
      {
        for: '/en/',
        values: {
          'x-custom-header': 'my custom header value',
        },
      },
      {
        for: '/es/',
        values: {
          'x-custom-header': 'my custom header value',
        },
      },
      {
        for: '/fr/',
        values: {
          'x-custom-header': 'my custom header value',
        },
      },
      {
        for: '/api/*',
        values: {
          'x-custom-api-header': 'my custom api header value',
        },
      },
      {
        for: '/en/api/*',
        values: {
          'x-custom-api-header': 'my custom api header value',
        },
      },
      {
        for: '/es/api/*',
        values: {
          'x-custom-api-header': 'my custom api header value',
        },
      },
      {
        for: '/fr/api/*',
        values: {
          'x-custom-api-header': 'my custom api header value',
        },
      },
      {
        for: '/*',
        values: {
          'x-custom-header-for-everything': 'my custom header for everything value',
        },
      },
      {
        for: '/en/*',
        values: {
          'x-custom-header-for-everything': 'my custom header for everything value',
        },
      },
      {
        for: '/es/*',
        values: {
          'x-custom-header-for-everything': 'my custom header for everything value',
        },
      },
      {
        for: '/fr/*',
        values: {
          'x-custom-header-for-everything': 'my custom header for everything value',
        },
      },
    ])
  })

  it('appends no additional headers in the Netlify configuration when none are in the routes manifest', async () => {
    await moveNextDist()

    netlifyConfig.headers = [
      {
        for: '/',
        values: {
          'x-existing-header-in-configuration': 'existing header in configuration value',
        },
      },
    ]

    const show = jest.fn()

    const manifestPath = path.resolve('.next/routes-manifest.json')
    const routesManifest = await readJson(manifestPath)
    delete routesManifest.headers
    await writeJSON(manifestPath, routesManifest)

    await nextRuntime.onPostBuild({
      ...defaultArgs,

      utils: { ...defaultArgs.utils, status: { show }, functions: { list: jest.fn().mockResolvedValue([]) } },
    })

    expect(netlifyConfig.headers).toEqual([
      {
        for: '/',
        values: {
          'x-existing-header-in-configuration': 'existing header in configuration value',
        },
      },
    ])
  })
})

describe('function helpers', () => {
  describe('config', () => {
    describe('dependency tracing', () => {
      it('extracts a list of all dependencies', async () => {
        await moveNextDist()
        await nextRuntime.onBuild(defaultArgs)
        const dependencies = await getAllPageDependencies(constants.PUBLISH_DIR)
        expect(dependencies.map((dep) => normalizeChunkNames(relative(process.cwd(), dep))).sort()).toMatchSnapshot()
      })

      // TODO: `dependencies` references files inside the <root>/node_modules directory which isn't accessible in moveNextDist
      // So this whole test needs to be reworked as it can't be fixed
      it.skip('extracts dependencies that exist', async () => {
        await moveNextDist()
        await nextRuntime.onBuild(defaultArgs)
        const dependencies = await getAllPageDependencies(constants.PUBLISH_DIR)
        const filesExist = await Promise.all(dependencies.map((dep) => pathExists(dep)))
        expect(filesExist.sort().every((exists) => exists)).toBeTruthy()
      })
    })
  })
})

const middlewareSourceTs = /* typescript */ `
import { NextResponse } from 'next/server'
export async function middleware(req: NextRequest) {
  return NextResponse.next()
}
`

const middlewareSourceJs = /* javascript */ `
import { NextResponse } from 'next/server'
export async function middleware(req) {
  return NextResponse.next()
}
`

const wait = (seconds = 0.5) => new Promise((resolve) => setTimeout(resolve, seconds * 1000))

const middlewareExists = () => existsSync(resolve('.netlify', 'middleware.js'))

describe('onPreDev', () => {
  let runtime
  beforeAll(async () => {
    runtime = await nextRuntimeFactory({}, { events: new Set(['onPreDev']) })
  })

  it('should generate the runtime with onPreDev', () => {
    expect(runtime).toHaveProperty('onPreDev')
  })

  it('should compile middleware', async () => {
    await moveNextDist('.next', true)
    await writeFile(path.join(process.cwd(), 'middleware.ts'), middlewareSourceTs)
    expect(middlewareExists()).toBeFalsy()

    await runtime.onPreDev(defaultArgs)
    await wait()

    expect(middlewareExists()).toBeTruthy()
  })
})

// skipping for now as the feature works
// but the tests only seem to run successfully when run locally
describe('the dev middleware watcher', () => {
  const watchers = []

  afterEach(async () => {
    await Promise.all(
      watchers.map((watcher) => {
        console.log('closing watcher')
        return watcher.close()
      }),
    )
    watchers.length = 0
  })

  it('should compile a middleware file and then exit when killed', async () => {
    console.log('starting should compile a middleware file and then exit when killed')
    await moveNextDist('.next', true)
    await writeFile(path.join(process.cwd(), 'middleware.ts'), middlewareSourceTs)
    expect(middlewareExists()).toBeFalsy()
    const { watcher, isReady } = watchForMiddlewareChanges(process.cwd())
    watchers.push(watcher)
    await isReady
    expect(middlewareExists()).toBeTruthy()
  })

  it.skip('should compile a file if it is written after the watcher starts', async () => {
    console.log('starting should compile a file if it is written after the watcher starts')
    await moveNextDist('.next', true)
    const { watcher, isReady, nextBuild } = watchForMiddlewareChanges(process.cwd())
    watchers.push(watcher)
    await isReady
    expect(middlewareExists()).toBeFalsy()
    const isBuilt = nextBuild()
    await writeFile(path.join(process.cwd(), 'middleware.ts'), middlewareSourceTs)
    await isBuilt
    expect(middlewareExists()).toBeTruthy()
  })

  it.skip('should remove the output if the middleware is removed after the watcher starts', async () => {
    console.log('starting should remove the output if the middleware is removed after the watcher starts')
    await moveNextDist('.next', true)
    const { watcher, isReady, nextBuild } = watchForMiddlewareChanges(process.cwd())
    watchers.push(watcher)
    await isReady
    expect(middlewareExists()).toBeFalsy()
    let isBuilt = nextBuild()
    await writeFile(path.join(process.cwd(), 'middleware.ts'), middlewareSourceTs)
    await isBuilt
    expect(middlewareExists()).toBeTruthy()
    isBuilt = nextBuild()
    await unlink(path.join(process.cwd(), 'middleware.ts'))
    await isBuilt
    expect(middlewareExists()).toBeFalsy()
  })

  it.skip('should remove the output if invalid middleware is written after the watcher starts', async () => {
    console.log('starting should remove the output if invalid middleware is written after the watcher starts')
    await moveNextDist('.next', true)
    const { watcher, isReady, nextBuild } = watchForMiddlewareChanges(process.cwd())
    watchers.push(watcher)
    await isReady
    expect(middlewareExists()).toBeFalsy()
    let isBuilt = nextBuild()
    await writeFile(path.join(process.cwd(), 'middleware.ts'), middlewareSourceTs)
    await isBuilt
    expect(middlewareExists()).toBeTruthy()
    isBuilt = nextBuild()
    await writeFile(path.join(process.cwd(), 'middleware.ts'), 'this is not valid middleware')
    await isBuilt
    expect(middlewareExists()).toBeFalsy()
  })

  it.skip('should recompile the middleware if it is moved into the src directory after the watcher starts', async () => {
    console.log(
      'starting should recompile the middleware if it is moved into the src directory after the watcher starts',
    )
    await moveNextDist('.next', true)
    const { watcher, isReady, nextBuild } = watchForMiddlewareChanges(process.cwd())
    watchers.push(watcher)
    await isReady
    expect(middlewareExists()).toBeFalsy()
    let isBuilt = nextBuild()
    await writeFile(path.join(process.cwd(), 'middleware.ts'), middlewareSourceTs)
    await isBuilt
    expect(middlewareExists()).toBeTruthy()
    isBuilt = nextBuild()
    await move(path.join(process.cwd(), 'middleware.ts'), path.join(process.cwd(), 'src', 'middleware.ts'))
    await isBuilt
    expect(middlewareExists()).toBeTruthy()
  })

  it.skip('should recompile the middleware if it is moved into the root directory after the watcher starts', async () => {
    console.log(
      'starting should recompile the middleware if it is moved into the root directory after the watcher starts',
    )
    await moveNextDist('.next', true)
    const { watcher, isReady, nextBuild } = watchForMiddlewareChanges(process.cwd())
    watchers.push(watcher)
    await isReady
    expect(middlewareExists()).toBeFalsy()
    let isBuilt = nextBuild()
    await ensureDir(path.join(process.cwd(), 'src'))
    await writeFile(path.join(process.cwd(), 'src', 'middleware.ts'), middlewareSourceTs)
    await isBuilt
    expect(middlewareExists()).toBeTruthy()
    isBuilt = nextBuild()
    await move(path.join(process.cwd(), 'src', 'middleware.ts'), path.join(process.cwd(), 'middleware.ts'))
    await isBuilt
    expect(middlewareExists()).toBeTruthy()
  })

  it.skip('should compile the middleware if invalid source is replaced with valid source after the watcher starts', async () => {
    console.log(
      'starting should compile the middleware if invalid source is replaced with valid source after the watcher starts',
    )
    await moveNextDist('.next', true)
    const { watcher, isReady, nextBuild } = watchForMiddlewareChanges(process.cwd())
    watchers.push(watcher)
    await isReady
    expect(middlewareExists()).toBeFalsy()
    let isBuilt = nextBuild()
    await writeFile(path.join(process.cwd(), 'middleware.ts'), 'this is not valid middleware')
    await isBuilt
    expect(middlewareExists()).toBeFalsy()
    isBuilt = nextBuild()
    await writeFile(path.join(process.cwd(), 'middleware.ts'), middlewareSourceTs)
    await isBuilt
    expect(middlewareExists()).toBeTruthy()
  })

  it.skip('should not compile middleware if more than one middleware file exists', async () => {
    console.log('starting should not compile middleware if more than one middleware file exists')
    await moveNextDist('.next', true)
    const { watcher, isReady, nextBuild } = watchForMiddlewareChanges(process.cwd())
    watchers.push(watcher)
    await isReady
    expect(middlewareExists()).toBeFalsy()
    await writeFile(path.join(process.cwd(), 'middleware.ts'), middlewareSourceTs)
    const isBuilt = nextBuild()
    await writeFile(path.join(process.cwd(), 'middleware.js'), middlewareSourceJs)
    await isBuilt
    expect(middlewareExists()).toBeFalsy()
  })

  it.skip('should not compile middleware if a second middleware file is added after the watcher starts', async () => {
    console.log('starting should not compile middleware if a second middleware file is added after the watcher starts')
    await moveNextDist('.next', true)
    const { watcher, isReady, nextBuild } = watchForMiddlewareChanges(process.cwd())
    watchers.push(watcher)
    await isReady
    expect(middlewareExists()).toBeFalsy()
    let isBuilt = nextBuild()
    await writeFile(path.join(process.cwd(), 'middleware.ts'), middlewareSourceTs)
    await isBuilt
    expect(middlewareExists()).toBeTruthy()
    isBuilt = nextBuild()
    await writeFile(path.join(process.cwd(), 'middleware.js'), middlewareSourceJs)
    await isBuilt
    expect(middlewareExists()).toBeFalsy()
  })

  it.skip('should compile middleware if a second middleware file is removed after the watcher starts', async () => {
    console.log('starting should compile middleware if a second middleware file is removed after the watcher starts')
    await moveNextDist('.next', true)
    const { watcher, isReady, nextBuild } = watchForMiddlewareChanges(process.cwd())
    watchers.push(watcher)
    await isReady
    expect(middlewareExists()).toBeFalsy()
    let isBuilt = nextBuild()
    await writeFile(path.join(process.cwd(), 'middleware.ts'), middlewareSourceTs)
    await isBuilt
    isBuilt = nextBuild()
    await writeFile(path.join(process.cwd(), 'middleware.js'), middlewareSourceJs)
    await isBuilt
    expect(middlewareExists()).toBeFalsy()
    isBuilt = nextBuild()
    await unlink(path.join(process.cwd(), 'middleware.js'))
    await isBuilt
    expect(middlewareExists()).toBeTruthy()
  })

  it.skip('should generate the correct output for each case when middleware is compiled, added, removed and for error states', async () => {
    console.log(
      'starting should generate the correct output for each case when middleware is compiled, added, removed and for error states',
    )
    await moveNextDist('.next', true)
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation((args) => console.warn(args?.errors?.[0]?.text))
    const { watcher, isReady, nextBuild } = watchForMiddlewareChanges(process.cwd())
    watchers.push(watcher)
    await isReady
    expect(middlewareExists()).toBeFalsy()
    expect(consoleLogSpy).toHaveBeenCalledWith('Initial scan for middleware file complete. Ready for changes.')
    consoleLogSpy.mockClear()
    let isBuilt = nextBuild()
    await writeFile(path.join(process.cwd(), 'middleware.ts'), middlewareSourceTs)
    await isBuilt
    expect(consoleLogSpy).toHaveBeenCalledWith('Rebuilding middleware middleware.ts...')
    consoleLogSpy.mockClear()
    consoleErrorSpy.mockClear()
    isBuilt = nextBuild()
    await writeFile(path.join(process.cwd(), 'middleware.ts'), 'this is not valid middleware')
    await isBuilt
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error: Build failed with 1 error'))

    isBuilt = nextBuild()
    await writeFile(path.join(process.cwd(), 'middleware.ts'), middlewareSourceTs)
    await isBuilt
    isBuilt = nextBuild()
    expect(middlewareExists()).toBeTruthy()
    consoleLogSpy.mockClear()

    await writeFile(path.join(process.cwd(), 'middleware.js'), middlewareSourceJs)
    await isBuilt
    expect(consoleLogSpy).toHaveBeenCalledWith('Multiple middleware files found:')
    consoleLogSpy.mockClear()
    expect(middlewareExists()).toBeFalsy()
  })
})
