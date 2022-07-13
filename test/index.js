jest.mock('../plugin/src/helpers/utils', () => {
  return {
    ...jest.requireActual('../plugin/src/helpers/utils'),
    isNextAuthInstalled: jest.fn(),
  }
})

const Chance = require('chance')
const { writeJSON, unlink, existsSync, readFileSync, copy, ensureDir, readJson } = require('fs-extra')
const path = require('path')
const process = require('process')
const os = require('os')
const cpy = require('cpy')
const { dir: getTmpDir } = require('tmp-promise')
const { downloadFile } = require('../plugin/src/templates/handlerUtils')

const plugin = require('../plugin/src')

const { HANDLER_FUNCTION_NAME, ODB_FUNCTION_NAME, IMAGE_FUNCTION_NAME } = require('../plugin/src/constants')
const { join } = require('pathe')
const {
  matchMiddleware,
  stripLocale,
  matchesRedirect,
  matchesRewrite,
  patchNextFiles,
  unpatchNextFiles,
} = require('../plugin/src/helpers/files')
const {
  getRequiredServerFiles,
  updateRequiredServerFiles,
  generateCustomHeaders,
} = require('../plugin/src/helpers/config')
const { dirname } = require('path')
const { getProblematicUserRewrites } = require('../plugin/src/helpers/verification')
const { onPostBuild } = require('../plugin/lib')
const { basePath } = require('../demos/next-i18next/next.config')

const chance = new Chance()
const FIXTURES_DIR = `${__dirname}/fixtures`
const SAMPLE_PROJECT_DIR = `${__dirname}/../demos/default`
const constants = {
  INTERNAL_FUNCTIONS_SRC: '.netlify/functions-internal',
  PUBLISH_DIR: '.next',
  FUNCTIONS_DIST: '.netlify/functions',
}
const utils = {
  build: {
    failBuild(message) {
      throw new Error(message)
    },
  },
  run: async () => void 0,
  cache: {
    save: jest.fn(),
    restore: jest.fn(),
  },
}

const REDIRECTS = [
  {
    source: '/:file((?!\\.well-known(?:/.*)?)(?:[^/]+/)*[^/]+\\.\\w+)/',
    destination: '/:file',
    locale: false,
    internal: true,
    statusCode: 308,
    regex: '^(?:/((?!\\.well-known(?:/.*)?)(?:[^/]+/)*[^/]+\\.\\w+))/$',
  },
  {
    source: '/:notfile((?!\\.well-known(?:/.*)?)(?:[^/]+/)*[^/\\.]+)',
    destination: '/:notfile/',
    locale: false,
    internal: true,
    statusCode: 308,
    regex: '^(?:/((?!\\.well-known(?:/.*)?)(?:[^/]+/)*[^/\\.]+))$',
  },
  {
    source: '/en/redirectme',
    destination: '/',
    statusCode: 308,
    regex: '^(?!/_next)/en/redirectme(?:/)?$',
  },
  {
    source: '/:nextInternalLocale(en|es|fr)/redirectme',
    destination: '/:nextInternalLocale/',
    statusCode: 308,
    regex: '^(?!/_next)(?:/(en|es|fr))/redirectme(?:/)?$',
  },
]

const REWRITES = [
  {
    source: '/:nextInternalLocale(en|es|fr)/old/:path*',
    destination: '/:nextInternalLocale/:path*',
    regex: '^(?:/(en|es|fr))/old(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$',
  },
]

// Temporary switch cwd
const changeCwd = function (cwd) {
  const originalCwd = process.cwd()
  process.chdir(cwd)
  return () => {
    process.chdir(originalCwd)
  }
}

const onBuildHasRun = (netlifyConfig) =>
  Boolean(netlifyConfig.functions[HANDLER_FUNCTION_NAME]?.included_files?.some((file) => file.includes('BUILD_ID')))

const rewriteAppDir = async function (dir = '.next') {
  const manifest = path.join(dir, 'required-server-files.json')
  const manifestContent = await readJson(manifest)
  manifestContent.appDir = process.cwd()

  await writeJSON(manifest, manifestContent)
}

// Move .next from sample project to current directory
const moveNextDist = async function (dir = '.next') {
  await stubModules(['next', 'sharp'])
  await ensureDir(dirname(dir))
  await copy(path.join(SAMPLE_PROJECT_DIR, '.next'), path.join(process.cwd(), dir))
  await rewriteAppDir(dir)
}

const stubModules = async function (modules) {
  for (const mod of modules) {
    const dir = path.join(process.cwd(), 'node_modules', mod)
    await ensureDir(dir)
    await writeJSON(path.join(dir, 'package.json'), { name: mod })
  }
}

// Copy fixture files to the current directory
const useFixture = async function (fixtureName) {
  const fixtureDir = `${FIXTURES_DIR}/${fixtureName}`
  await cpy('**', process.cwd(), { cwd: fixtureDir, parents: true, overwrite: true, dot: true })
}

const netlifyConfig = { build: { command: 'npm run build' }, functions: {}, redirects: [], headers: [] }
const defaultArgs = {
  netlifyConfig,
  utils,
  constants,
}

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
  netlifyConfig.functions[HANDLER_FUNCTION_NAME] && (netlifyConfig.functions[HANDLER_FUNCTION_NAME].included_files = [])
  netlifyConfig.functions[ODB_FUNCTION_NAME] && (netlifyConfig.functions[ODB_FUNCTION_NAME].included_files = [])
  await useFixture('serverless_next_config')
})

afterEach(async () => {
  jest.clearAllMocks()
  jest.resetAllMocks()
  // Cleans up the temporary directory from `getTmpDir()` and do not make it
  // the current directory anymore
  restoreCwd()
  await cleanup()
})

describe('preBuild()', () => {
  test('fails if publishing the root of the project', () => {
    defaultArgs.netlifyConfig.build.publish = path.resolve('.')
    expect(plugin.onPreBuild(defaultArgs)).rejects.toThrowError(
      /Your publish directory is pointing to the base directory of your site/,
    )
  })

  test('fails if the build version is too old', () => {
    expect(
      plugin.onPreBuild({
        ...defaultArgs,
        constants: { IS_LOCAL: true, NETLIFY_BUILD_VERSION: '18.15.0' },
      }),
    ).rejects.toThrow('This version of the Essential Next.js plugin requires netlify-cli')
  })

  test('passes if the build version is new enough', async () => {
    expect(
      plugin.onPreBuild({
        ...defaultArgs,
        constants: { IS_LOCAL: true, NETLIFY_BUILD_VERSION: '18.16.1' },
      }),
    ).resolves.not.toThrow()
  })

  it('restores cache with right paths', async () => {
    await useFixture('dist_dir_next_config')

    const restore = jest.fn()

    await plugin.onPreBuild({
      ...defaultArgs,
      utils: { ...utils, cache: { restore } },
    })

    expect(restore).toHaveBeenCalledWith(path.resolve('.next/cache'))
  })

  it('forces the target to "server"', async () => {
    const netlifyConfig = { ...defaultArgs.netlifyConfig }

    await plugin.onPreBuild({ ...defaultArgs, netlifyConfig })
    expect(netlifyConfig.build.environment.NEXT_PRIVATE_TARGET).toBe('server')
  })
})

describe('onBuild()', () => {
  const { isNextAuthInstalled } = require('../plugin/src/helpers/utils')

  beforeEach(() => {
    isNextAuthInstalled.mockImplementation(() => {
      return true
    })
  })

  afterEach(() => {
    delete process.env.URL
  })

  test('does not set NEXTAUTH_URL if value is already set', async () => {
    const mockUserDefinedSiteUrl = chance.url()
    process.env.URL = chance.url()

    await moveNextDist()

    const initialConfig = await getRequiredServerFiles(netlifyConfig.build.publish)

    initialConfig.config.env.NEXTAUTH_URL = mockUserDefinedSiteUrl
    await updateRequiredServerFiles(netlifyConfig.build.publish, initialConfig)

    await plugin.onBuild(defaultArgs)

    expect(onBuildHasRun(netlifyConfig)).toBe(true)
    const config = await getRequiredServerFiles(netlifyConfig.build.publish)

    expect(config.config.env.NEXTAUTH_URL).toEqual(mockUserDefinedSiteUrl)
  })

  test('sets NEXTAUTH_URL when next-auth package is detected', async () => {
    const mockSiteUrl = chance.url()

    // Value represents the main address to the site and is either
    // a Netlify subdomain or custom domain set by the user.
    // See https://docs.netlify.com/configure-builds/environment-variables/#deploy-urls-and-metadata
    process.env.URL = mockSiteUrl

    await moveNextDist()

    await plugin.onBuild(defaultArgs)

    expect(onBuildHasRun(netlifyConfig)).toBe(true)
    const config = await getRequiredServerFiles(netlifyConfig.build.publish)

    expect(config.config.env.NEXTAUTH_URL).toEqual(mockSiteUrl)
  })

  test('includes the basePath on NEXTAUTH_URL when present', async () => {
    const mockSiteUrl = chance.url()
    process.env.URL = mockSiteUrl

    await moveNextDist()

    const initialConfig = await getRequiredServerFiles(netlifyConfig.build.publish)
    initialConfig.config.basePath = '/foo'
    await updateRequiredServerFiles(netlifyConfig.build.publish, initialConfig)

    await plugin.onBuild(defaultArgs)

    expect(onBuildHasRun(netlifyConfig)).toBe(true)
    const config = await getRequiredServerFiles(netlifyConfig.build.publish)

    expect(config.config.env.NEXTAUTH_URL).toEqual(`${mockSiteUrl}/foo`)
  })

  test('skips setting NEXTAUTH_URL when next-auth package is not found', async () => {
    isNextAuthInstalled.mockImplementation(() => {
      return false
    })

    await moveNextDist()
    await plugin.onBuild(defaultArgs)

    expect(onBuildHasRun(netlifyConfig)).toBe(true)
    const config = await getRequiredServerFiles(netlifyConfig.build.publish)

    expect(config.config.env.NEXTAUTH_URL).toBeUndefined()
  })

  test('runs onBuild', async () => {
    await moveNextDist()

    await plugin.onBuild(defaultArgs)

    expect(onBuildHasRun(netlifyConfig)).toBe(true)
  })

  test('skips if NETLIFY_NEXT_PLUGIN_SKIP is set', async () => {
    process.env.NETLIFY_NEXT_PLUGIN_SKIP = 'true'
    await moveNextDist()
    await plugin.onBuild(defaultArgs)

    expect(onBuildHasRun(netlifyConfig)).toBe(false)
    delete process.env.NETLIFY_NEXT_PLUGIN_SKIP
  })

  test('skips if NEXT_PLUGIN_FORCE_RUN is "false"', async () => {
    process.env.NEXT_PLUGIN_FORCE_RUN = 'false'
    await moveNextDist()
    await plugin.onBuild(defaultArgs)

    expect(onBuildHasRun(netlifyConfig)).toBe(false)
    delete process.env.NEXT_PLUGIN_FORCE_RUN
  })

  test("fails if BUILD_ID doesn't exist", async () => {
    await moveNextDist()
    await unlink(path.join(process.cwd(), '.next/BUILD_ID'))
    const failBuild = jest.fn().mockImplementation((err) => {
      throw new Error(err)
    })
    expect(() => plugin.onBuild({ ...defaultArgs, utils: { ...utils, build: { failBuild } } })).rejects.toThrow(
      `In most cases it should be set to ".next", unless you have chosen a custom "distDir" in your Next config.`,
    )
    expect(failBuild).toHaveBeenCalled()
  })

  test("fails with helpful warning if BUILD_ID doesn't exist and publish is 'out'", async () => {
    await moveNextDist()
    await unlink(path.join(process.cwd(), '.next/BUILD_ID'))
    const failBuild = jest.fn().mockImplementation((err) => {
      throw new Error(err)
    })
    netlifyConfig.build.publish = path.resolve('out')

    expect(() => plugin.onBuild({ ...defaultArgs, utils: { ...utils, build: { failBuild } } })).rejects.toThrow(
      `Your publish directory is set to "out", but in most cases it should be ".next".`,
    )
    expect(failBuild).toHaveBeenCalled()
  })

  test('fails build if next export has run', async () => {
    await moveNextDist()
    await writeJSON(path.join(process.cwd(), '.next/export-detail.json'), {})
    const failBuild = jest.fn()
    await plugin.onBuild({ ...defaultArgs, utils: { ...utils, build: { failBuild } } })
    expect(failBuild).toHaveBeenCalled()
  })

  test('copy handlers to the internal functions directory', async () => {
    await moveNextDist()

    await plugin.onBuild(defaultArgs)

    expect(existsSync(`.netlify/functions-internal/___netlify-handler/___netlify-handler.js`)).toBeTruthy()
    expect(existsSync(`.netlify/functions-internal/___netlify-handler/bridge.js`)).toBeTruthy()
    expect(existsSync(`.netlify/functions-internal/___netlify-handler/handlerUtils.js`)).toBeTruthy()
    expect(existsSync(`.netlify/functions-internal/___netlify-odb-handler/___netlify-odb-handler.js`)).toBeTruthy()
    expect(existsSync(`.netlify/functions-internal/___netlify-odb-handler/bridge.js`)).toBeTruthy()
    expect(existsSync(`.netlify/functions-internal/___netlify-odb-handler/handlerUtils.js`)).toBeTruthy()
  })

  test('writes correct redirects to netlifyConfig', async () => {
    await moveNextDist()

    await plugin.onBuild(defaultArgs)
    // Not ideal, because it doesn't test precedence, but unfortunately the exact order seems to
    // be non-deterministic, as it depends on filesystem globbing across platforms.
    const sorted = [...netlifyConfig.redirects].sort((a, b) => a.from.localeCompare(b.from))
    expect(sorted).toMatchSnapshot()
  })

  test('publish dir is/has next dist', async () => {
    await moveNextDist()

    await plugin.onBuild(defaultArgs)
    expect(existsSync(path.resolve('.next/BUILD_ID'))).toBeTruthy()
  })

  test('generates static files manifest', async () => {
    await moveNextDist()
    await plugin.onBuild(defaultArgs)
    const manifestPath = path.resolve('.next/static-manifest.json')
    expect(existsSync(manifestPath)).toBeTruthy()
    const data = (await readJson(manifestPath)).sort()
    expect(data).toMatchSnapshot()
  })

  test('moves static files to root', async () => {
    await moveNextDist()
    await plugin.onBuild(defaultArgs)
    const data = JSON.parse(readFileSync(path.resolve('.next/static-manifest.json'), 'utf8'))
    data.forEach(([_, file]) => {
      expect(existsSync(path.resolve(path.join('.next', file)))).toBeTruthy()
      expect(existsSync(path.resolve(path.join('.next', 'server', 'pages', file)))).toBeFalsy()
    })
  })

  test('copies default locale files to top level', async () => {
    await moveNextDist()
    await plugin.onBuild(defaultArgs)
    const data = JSON.parse(readFileSync(path.resolve('.next/static-manifest.json'), 'utf8'))

    const locale = 'en/'

    data.forEach(([_, file]) => {
      if (!file.startsWith(locale)) {
        return
      }
      const trimmed = file.substring(locale.length)
      expect(existsSync(path.resolve(path.join('.next', trimmed)))).toBeTruthy()
    })
  })

  // TODO - TO BE MOVED TO TEST AGAINST A PROJECT WITH MIDDLEWARE IN ANOTHER PR
  test.skip('skips static files that match middleware', async () => {
    await moveNextDist()
    await plugin.onBuild(defaultArgs)

    expect(existsSync(path.resolve(path.join('.next', 'en', 'middle.html')))).toBeFalsy()
    expect(existsSync(path.resolve(path.join('.next', 'server', 'pages', 'en', 'middle.html')))).toBeTruthy()
  })

  test('sets correct config', async () => {
    await moveNextDist()

    await plugin.onBuild(defaultArgs)
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
      ".next/static/css/1152424140993be6.css",
      ".next/static/css/84099ae0bbc955fa.css",  
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

  test('generates a file referencing all page sources', async () => {
    await moveNextDist()
    await plugin.onBuild(defaultArgs)
    const handlerPagesFile = path.join(constants.INTERNAL_FUNCTIONS_SRC, HANDLER_FUNCTION_NAME, 'pages.js')
    const odbHandlerPagesFile = path.join(constants.INTERNAL_FUNCTIONS_SRC, ODB_FUNCTION_NAME, 'pages.js')
    expect(existsSync(handlerPagesFile)).toBeTruthy()
    expect(existsSync(odbHandlerPagesFile)).toBeTruthy()

    expect(readFileSync(handlerPagesFile, 'utf8')).toMatchSnapshot()
    expect(readFileSync(odbHandlerPagesFile, 'utf8')).toMatchSnapshot()
  })

  test('generates a file referencing all when publish dir is a subdirectory', async () => {
    const dir = 'web/.next'
    await moveNextDist(dir)
    netlifyConfig.build.publish = path.resolve(dir)
    const config = {
      ...defaultArgs,
      netlifyConfig,
      constants: { ...constants, PUBLISH_DIR: dir },
    }
    await plugin.onBuild(config)
    const handlerPagesFile = path.join(constants.INTERNAL_FUNCTIONS_SRC, HANDLER_FUNCTION_NAME, 'pages.js')
    const odbHandlerPagesFile = path.join(constants.INTERNAL_FUNCTIONS_SRC, ODB_FUNCTION_NAME, 'pages.js')

    expect(readFileSync(handlerPagesFile, 'utf8')).toMatchSnapshot()
    expect(readFileSync(odbHandlerPagesFile, 'utf8')).toMatchSnapshot()
  })

  test('generates entrypoints with correct references', async () => {
    await moveNextDist()
    await plugin.onBuild(defaultArgs)

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

  test('handles empty routesManifest.staticRoutes', async () => {
    await moveNextDist()
    const manifestPath = path.resolve('.next/routes-manifest.json')
    const routesManifest = await readJson(manifestPath)
    delete routesManifest.staticRoutes
    await writeJSON(manifestPath, routesManifest)
    // The function is supposed to return undefined, but we want to check if it throws
    expect(await plugin.onBuild(defaultArgs)).toBeUndefined()
  })

  test('generates imageconfig file with entries for domains and remotePatterns', async () => {
    await moveNextDist()
    await plugin.onBuild(defaultArgs)
    const imageConfigPath = path.join(constants.INTERNAL_FUNCTIONS_SRC, IMAGE_FUNCTION_NAME, 'imageconfig.json')
    const imageConfigJson = await readJson(imageConfigPath)
    expect(imageConfigJson.domains.length).toBe(1)
    expect(imageConfigJson.remotePatterns.length).toBe(1)
  })
})

describe('onPostBuild', () => {
  test('saves cache with right paths', async () => {
    await moveNextDist()

    const save = jest.fn()

    await plugin.onPostBuild({
      ...defaultArgs,
      utils: { ...utils, cache: { save }, functions: { list: jest.fn().mockResolvedValue([]) } },
    })

    expect(save).toHaveBeenCalledWith(path.resolve('.next/cache'))
  })

  test('warns if old functions exist', async () => {
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
    await plugin.onPostBuild({
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

  test('warns if NETLIFY_NEXT_PLUGIN_SKIP is set', async () => {
    await moveNextDist()

    process.env.NETLIFY_NEXT_PLUGIN_SKIP = 'true'
    await moveNextDist()
    const show = jest.fn()
    await plugin.onPostBuild({ ...defaultArgs, utils: { ...defaultArgs.utils, status: { show } } })
    expect(show).toHaveBeenCalledWith({
      summary: 'Next cache was stored, but all other functions were skipped because NETLIFY_NEXT_PLUGIN_SKIP is set',
      title: 'Essential Next.js plugin did not run',
    })
    delete process.env.NETLIFY_NEXT_PLUGIN_SKIP
  })

  test('warns if NEXT_PLUGIN_FORCE_RUN is "false"', async () => {
    await moveNextDist()

    process.env.NEXT_PLUGIN_FORCE_RUN = 'false'
    await moveNextDist()
    const show = jest.fn()
    await plugin.onPostBuild({ ...defaultArgs, utils: { ...defaultArgs.utils, status: { show } } })
    expect(show).toHaveBeenCalledWith({
      summary:
        'Next cache was stored, but all other functions were skipped because NEXT_PLUGIN_FORCE_RUN is set to false',
      title: 'Essential Next.js plugin did not run',
    })
    delete process.env.NEXT_PLUGIN_FORCE_RUN
  })

  test('finds problematic user rewrites', async () => {
    await moveNextDist()
    const rewrites = getProblematicUserRewrites({
      redirects: [
        { from: '/previous', to: '/rewrites-are-a-problem', status: 200 },
        { from: '/api', to: '/.netlify/functions/are-ok', status: 200 },
        { from: '/remote', to: 'http://example.com/proxying/is/ok', status: 200 },
        { from: '/old', to: '/redirects-are-fine' },
        { from: '/*', to: '/404-is-a-problem', status: 404 },
        ...netlifyConfig.redirects,
      ],
      basePath: '',
    })
    expect(rewrites).toEqual([
      {
        from: '/previous',
        status: 200,
        to: '/rewrites-are-a-problem',
      },
      {
        from: '/*',
        status: 404,
        to: '/404-is-a-problem',
      },
    ])
  })

  test('adds headers to Netlify configuration', async () => {
    await moveNextDist()

    const show = jest.fn()

    await plugin.onPostBuild({
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

  test('appends headers to existing headers in the Netlify configuration', async () => {
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

    await plugin.onPostBuild({
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

  test('appends no additional headers in the Netlify configuration when none are in the routes manifest', async () => {
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

    await plugin.onPostBuild({
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

describe('utility functions', () => {
  test('middleware tester matches correct paths', () => {
    const middleware = ['middle', 'sub/directory']
    const paths = [
      'middle.html',
      'middle',
      'middle/',
      'middle/ware',
      'sub/directory',
      'sub/directory.html',
      'sub/directory/child',
      'sub/directory/child.html',
    ]
    for (const path of paths) {
      expect(matchMiddleware(middleware, path)).toBeTruthy()
    }
  })

  test('middleware tester does not match incorrect paths', () => {
    const middleware = ['middle', 'sub/directory']
    const paths = [
      'middl',
      '',
      'somethingelse',
      'another.html',
      'another/middle.html',
      'sub/anotherdirectory.html',
      'sub/directoryelse',
      'sub/directoryelse.html',
    ]
    for (const path of paths) {
      expect(matchMiddleware(middleware, path)).toBeFalsy()
    }
  })

  test('middleware tester matches root middleware', () => {
    const middleware = ['']
    const paths = [
      'middl',
      '',
      'somethingelse',
      'another.html',
      'another/middle.html',
      'sub/anotherdirectory.html',
      'sub/directoryelse',
      'sub/directoryelse.html',
    ]
    for (const path of paths) {
      expect(matchMiddleware(middleware, path)).toBeTruthy()
    }
  })

  test('middleware tester matches root middleware', () => {
    const paths = [
      'middl',
      '',
      'somethingelse',
      'another.html',
      'another/middle.html',
      'sub/anotherdirectory.html',
      'sub/directoryelse',
      'sub/directoryelse.html',
    ]
    for (const path of paths) {
      expect(matchMiddleware(undefined, path)).toBeFalsy()
    }
  })

  test('stripLocale correctly strips matching locales', () => {
    const locales = ['en', 'fr', 'en-GB']
    const paths = [
      ['en/file.html', 'file.html'],
      ['fr/file.html', 'file.html'],
      ['en-GB/file.html', 'file.html'],
      ['file.html', 'file.html'],
    ]

    for (const [path, expected] of paths) {
      expect(stripLocale(path, locales)).toEqual(expected)
    }
  })

  test('stripLocale does not touch non-matching matching locales', () => {
    const locales = ['en', 'fr', 'en-GB']
    const paths = ['de/file.html', 'enfile.html', 'en-US/file.html']
    for (const path of paths) {
      expect(stripLocale(path, locales)).toEqual(path)
    }
  })

  test('matchesRedirect correctly matches paths with locales', () => {
    const paths = ['en/redirectme.html', 'en/redirectme.json', 'fr/redirectme.html', 'fr/redirectme.json']
    paths.forEach((path) => {
      expect(matchesRedirect(path, REDIRECTS)).toBeTruthy()
    })
  })

  test("matchesRedirect doesn't match paths with invalid locales", () => {
    const paths = ['dk/redirectme.html', 'dk/redirectme.json', 'gr/redirectme.html', 'gr/redirectme.json']
    paths.forEach((path) => {
      expect(matchesRedirect(path, REDIRECTS)).toBeFalsy()
    })
  })

  test("matchesRedirect doesn't match internal redirects", () => {
    const paths = ['en/notrailingslash']
    paths.forEach((path) => {
      expect(matchesRedirect(path, REDIRECTS)).toBeFalsy()
    })
  })

  it('matchesRewrite matches array of rewrites', () => {
    expect(matchesRewrite('en/old/page.html', REWRITES)).toBeTruthy()
  })

  it('matchesRewrite matches beforeFiles rewrites', () => {
    expect(matchesRewrite('en/old/page.html', { beforeFiles: REWRITES })).toBeTruthy()
  })

  it("matchesRewrite doesn't match afterFiles rewrites", () => {
    expect(matchesRewrite('en/old/page.html', { afterFiles: REWRITES })).toBeFalsy()
  })

  it('matchesRewrite matches various paths', () => {
    const paths = ['en/old/page.html', 'fr/old/page.html', 'en/old/deep/page.html', 'en/old.html']
    paths.forEach((path) => {
      expect(matchesRewrite(path, REWRITES)).toBeTruthy()
    })
  })

  test('patches Next server files', async () => {
    const root = path.resolve(dirname(__dirname))
    await copy(join(root, 'package.json'), path.join(process.cwd(), 'package.json'))
    await ensureDir(path.join(process.cwd(), 'node_modules'))
    await copy(path.join(root, 'node_modules', 'next'), path.join(process.cwd(), 'node_modules', 'next'))

    await patchNextFiles(process.cwd())
    const serverFile = path.resolve(process.cwd(), 'node_modules', 'next', 'dist', 'server', 'base-server.js')
    const patchedData = await readFileSync(serverFile, 'utf8')
    expect(patchedData.includes('_BYPASS_SSG')).toBeTruthy()

    await unpatchNextFiles(process.cwd())

    const unPatchedData = await readFileSync(serverFile, 'utf8')
    expect(unPatchedData.includes('_BYPASS_SSG')).toBeFalsy()
  })
})

describe('function helpers', () => {
  it('downloadFile can download a file', async () => {
    const url =
      'https://raw.githubusercontent.com/netlify/netlify-plugin-nextjs/c2668af24a78eb69b33222913f44c1900a3bce23/manifest.yml'
    const tmpFile = join(os.tmpdir(), 'next-test', 'downloadfile.txt')
    await ensureDir(path.dirname(tmpFile))
    await downloadFile(url, tmpFile)
    expect(existsSync(tmpFile)).toBeTruthy()
    expect(readFileSync(tmpFile, 'utf8')).toMatchInlineSnapshot(`
      "name: netlify-plugin-nextjs-experimental
      "
    `)
    await unlink(tmpFile)
  })

  it('downloadFile throws on bad domain', async () => {
    const url = 'https://nonexistentdomain.example'
    const tmpFile = join(os.tmpdir(), 'next-test', 'downloadfile.txt')
    await ensureDir(path.dirname(tmpFile))
    await expect(downloadFile(url, tmpFile)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"getaddrinfo ENOTFOUND nonexistentdomain.example"`,
    )
  })

  it('downloadFile throws on 404', async () => {
    const url = 'https://example.com/nonexistentfile'
    const tmpFile = join(os.tmpdir(), 'next-test', 'downloadfile.txt')
    await ensureDir(path.dirname(tmpFile))
    await expect(downloadFile(url, tmpFile)).rejects.toThrowError(
      'Failed to download https://example.com/nonexistentfile: 404 Not Found',
    )
  })

  describe('config', () => {
    describe('generateCustomHeaders', () => {
      // The routesManifest is the contents of the routes-manifest.json file which will already contain the generated
      // header paths which take locales and base path into account which is why you'll see them in the paths already
      // in test data.

      it('sets custom headers in the Netlify configuration', () => {
        const nextConfig = {
          routesManifest: {
            headers: [
              // single header for a route
              {
                source: '/',
                headers: [
                  {
                    key: 'X-Unit-Test',
                    value: 'true',
                  },
                ],
                regex: '^/(?:/)?$',
              },
              // multiple headers for a route
              {
                source: '/unit-test',
                headers: [
                  {
                    key: 'X-Another-Unit-Test',
                    value: 'true',
                  },
                  {
                    key: 'X-Another-Unit-Test-Again',
                    value: 'true',
                  },
                ],
                regex: '^/(?:/)?$',
              },
            ],
          },
        }

        generateCustomHeaders(nextConfig, netlifyConfig.headers)

        expect(netlifyConfig.headers).toEqual([
          {
            for: '/',
            values: {
              'X-Unit-Test': 'true',
            },
          },
          {
            for: '/unit-test',
            values: {
              'X-Another-Unit-Test': 'true',
              'X-Another-Unit-Test-Again': 'true',
            },
          },
        ])
      })

      it('sets custom headers using a splat instead of a named splat in the Netlify configuration', () => {
        netlifyConfig.headers = []

        const nextConfig = {
          routesManifest: {
            headers: [
              // single header for a route
              {
                source: '/:path*',
                headers: [
                  {
                    key: 'X-Unit-Test',
                    value: 'true',
                  },
                ],
                regex: '^/(?:/)?$',
              },
              // multiple headers for a route
              {
                source: '/some-other-path/:path*',
                headers: [
                  {
                    key: 'X-Another-Unit-Test',
                    value: 'true',
                  },
                  {
                    key: 'X-Another-Unit-Test-Again',
                    value: 'true',
                  },
                ],
                regex: '^/(?:/)?$',
              },
              {
                source: '/some-other-path/yolo/:path*',
                headers: [
                  {
                    key: 'X-Another-Unit-Test',
                    value: 'true',
                  },
                ],
                regex: '^/(?:/)?$',
              },
            ],
          },
        }

        generateCustomHeaders(nextConfig, netlifyConfig.headers)

        expect(netlifyConfig.headers).toEqual([
          {
            for: '/*',
            values: {
              'X-Unit-Test': 'true',
            },
          },
          {
            for: '/some-other-path/*',
            values: {
              'X-Another-Unit-Test': 'true',
              'X-Another-Unit-Test-Again': 'true',
            },
          },
          {
            for: '/some-other-path/yolo/*',
            values: {
              'X-Another-Unit-Test': 'true',
            },
          },
        ])
      })

      it('appends custom headers in the Netlify configuration', () => {
        netlifyConfig.headers = [
          {
            for: '/',
            values: {
              'X-Existing-Header': 'true',
            },
          },
        ]

        const nextConfig = {
          routesManifest: {
            headers: [
              // single header for a route
              {
                source: '/',
                headers: [
                  {
                    key: 'X-Unit-Test',
                    value: 'true',
                  },
                ],
                regex: '^/(?:/)?$',
              },
              // multiple headers for a route
              {
                source: '/unit-test',
                headers: [
                  {
                    key: 'X-Another-Unit-Test',
                    value: 'true',
                  },
                  {
                    key: 'X-Another-Unit-Test-Again',
                    value: 'true',
                  },
                ],
                regex: '^/(?:/)?$',
              },
            ],
          },
        }

        generateCustomHeaders(nextConfig, netlifyConfig.headers)

        expect(netlifyConfig.headers).toEqual([
          {
            for: '/',
            values: {
              'X-Existing-Header': 'true',
            },
          },
          {
            for: '/',
            values: {
              'X-Unit-Test': 'true',
            },
          },
          {
            for: '/unit-test',
            values: {
              'X-Another-Unit-Test': 'true',
              'X-Another-Unit-Test-Again': 'true',
            },
          },
        ])
      })

      it('sets custom headers using basePath in the Next.js configuration', () => {
        netlifyConfig.headers = []

        const basePath = '/base-path'
        const nextConfig = {
          routesManifest: {
            headers: [
              // single header for a route
              {
                source: `${basePath}/:path*`,
                headers: [
                  {
                    key: 'X-Unit-Test',
                    value: 'true',
                  },
                ],
                regex: '^/(?:/)?$',
              },
              // multiple headers for a route
              {
                source: `${basePath}/some-other-path/:path*`,
                headers: [
                  {
                    key: 'X-Another-Unit-Test',
                    value: 'true',
                  },
                  {
                    key: 'X-Another-Unit-Test-Again',
                    value: 'true',
                  },
                ],
                regex: '^/(?:/)?$',
              },
            ],
          },
        }

        generateCustomHeaders(nextConfig, netlifyConfig.headers)

        expect(netlifyConfig.headers).toEqual([
          {
            for: '/base-path/*',
            values: {
              'X-Unit-Test': 'true',
            },
          },
          {
            for: '/base-path/some-other-path/*',
            values: {
              'X-Another-Unit-Test': 'true',
              'X-Another-Unit-Test-Again': 'true',
            },
          },
        ])
      })

      it('sets custom headers omitting basePath when a header has basePath set to false', () => {
        netlifyConfig.headers = []

        const basePath = '/base-path'

        const nextConfig = {
          routesManifest: {
            headers: [
              // single header for a route
              {
                source: '/:path*',
                headers: [
                  {
                    key: 'X-Unit-Test',
                    value: 'true',
                  },
                ],
                basePath: false,
                regex: '^/(?:/)?$',
              },
              // multiple headers for a route
              {
                source: `${basePath}/some-other-path/:path*`,
                headers: [
                  {
                    key: 'X-Another-Unit-Test',
                    value: 'true',
                  },
                ],
                regex: '^/(?:/)?$',
              },
            ],
          },
        }

        generateCustomHeaders(nextConfig, netlifyConfig.headers)

        expect(netlifyConfig.headers).toEqual([
          {
            for: '/*',
            values: {
              'X-Unit-Test': 'true',
            },
          },
          {
            for: '/base-path/some-other-path/*',
            values: {
              'X-Another-Unit-Test': 'true',
            },
          },
        ])
      })

      it('prepends locales set in the next.config to paths for custom headers', () => {
        netlifyConfig.headers = []

        // I'm not setting locales in the nextConfig, because at this point in the post build when this runs,
        // Next.js has modified the routesManifest to have the locales in the source.
        const nextConfig = {
          i18n: {
            locales: ['en', 'fr'],
            defaultLocale: 'en',
          },
          routesManifest: {
            headers: [
              {
                source: '/:nextInternalLocale(en|fr)/with-locale/:path*',
                headers: [
                  {
                    key: 'X-Unit-Test',
                    value: 'true',
                  },
                ],
                regex: '^/(?:/)?$',
              },
            ],
          },
        }

        generateCustomHeaders(nextConfig, netlifyConfig.headers)

        expect(netlifyConfig.headers).toEqual([
          {
            for: '/with-locale/*',
            values: {
              'X-Unit-Test': 'true',
            },
          },
          {
            for: '/en/with-locale/*',
            values: {
              'X-Unit-Test': 'true',
            },
          },
          {
            for: '/fr/with-locale/*',
            values: {
              'X-Unit-Test': 'true',
            },
          },
        ])
      })

      it('does not prepend locales set in the next.config to custom headers that have locale set to false', () => {
        netlifyConfig.headers = []

        const nextConfig = {
          i18n: {
            locales: ['en', 'fr'],
            defaultLocale: 'en',
          },
          routesManifest: {
            headers: [
              {
                source: '/:nextInternalLocale(en|fr)/with-locale/:path*',
                headers: [
                  {
                    key: 'X-Unit-Test',
                    value: 'true',
                  },
                ],
                regex: '^/(?:/)?$',
              },
              {
                source: '/fr/le-custom-locale-path/:path*',
                locale: false,
                headers: [
                  {
                    key: 'X-Unit-Test',
                    value: 'true',
                  },
                ],
                regex: '^/(?:/)?$',
              },
            ],
          },
        }

        generateCustomHeaders(nextConfig, netlifyConfig.headers)

        expect(netlifyConfig.headers).toEqual([
          {
            for: '/with-locale/*',
            values: {
              'X-Unit-Test': 'true',
            },
          },
          {
            for: '/en/with-locale/*',
            values: {
              'X-Unit-Test': 'true',
            },
          },
          {
            for: '/fr/with-locale/*',
            values: {
              'X-Unit-Test': 'true',
            },
          },
          {
            for: '/fr/le-custom-locale-path/*',
            values: {
              'X-Unit-Test': 'true',
            },
          },
        ])
      })
    })
  })
})
