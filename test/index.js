const { writeJSON, unlink, existsSync, readFileSync, copy, ensureDir } = require('fs-extra')
const path = require('path')
const process = require('process')
const os = require('os')
const cpy = require('cpy')
const { dir: getTmpDir } = require('tmp-promise')

const plugin = require('../src')

const { HANDLER_FUNCTION_NAME, ODB_FUNCTION_NAME } = require('../src/constants')

const FIXTURES_DIR = `${__dirname}/fixtures`
const SAMPLE_PROJECT_DIR = `${__dirname}/../demo`
const constants = {
  INTERNAL_FUNCTIONS_SRC: '.netlify/internal-functions',
  PUBLISH_DIR: '.next',
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

// Move .next from sample project to current directory
const moveNextDist = async function () {
  await stubModules(['next', 'sharp'])
  await copy(path.join(SAMPLE_PROJECT_DIR, '.next'), path.join(process.cwd(), '.next'))
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

const netlifyConfig = { build: { command: 'npm run build' }, functions: {}, redirects: [] }
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

  netlifyConfig.build.publish = path.posix.resolve('.next')
  netlifyConfig.redirects = []
  netlifyConfig.functions[HANDLER_FUNCTION_NAME] && (netlifyConfig.functions[HANDLER_FUNCTION_NAME].included_files = [])
  netlifyConfig.functions[ODB_FUNCTION_NAME] && (netlifyConfig.functions[ODB_FUNCTION_NAME].included_files = [])
  await useFixture('serverless_next_config')
})

afterEach(async () => {
  jest.clearAllMocks()
  jest.resetAllMocks()
  delete process.env.NEXT_PRIVATE_TARGET
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

    expect(restore).toHaveBeenCalledWith(path.posix.resolve('.next/cache'))
  })
})

describe('onBuild()', () => {
  test('runs onBuild', async () => {
    await moveNextDist()

    await plugin.onBuild(defaultArgs)

    expect(onBuildHasRun(netlifyConfig)).toBe(true)
  })

  test("fails if BUILD_ID doesn't exist", async () => {
    await moveNextDist()
    await unlink(path.join(process.cwd(), '.next/BUILD_ID'))
    const failBuild = jest.fn()
    await plugin.onBuild({ ...defaultArgs, utils: { ...utils, build: { failBuild } } })
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

    expect(existsSync(`.netlify/internal-functions/___netlify-handler/___netlify-handler.js`)).toBeTruthy()
    expect(existsSync(`.netlify/internal-functions/___netlify-handler/bridge.js`)).toBeTruthy()
    expect(existsSync(`.netlify/internal-functions/___netlify-odb-handler/___netlify-odb-handler.js`)).toBeTruthy()
    expect(existsSync(`.netlify/internal-functions/___netlify-odb-handler/bridge.js`)).toBeTruthy()
  })

  test('writes correct redirects to netlifyConfig', async () => {
    await moveNextDist()

    await plugin.onBuild(defaultArgs)

    expect(netlifyConfig.redirects).toMatchSnapshot()
  })

  test('publish dir is/has next dist', async () => {
    await moveNextDist()

    await plugin.onBuild(defaultArgs)
    expect(existsSync(path.resolve('.next/BUILD_ID'))).toBeTruthy()
  })

  test('sets correct config', async () => {
    await moveNextDist()

    await plugin.onBuild(defaultArgs)
    const includes = [
      '.next/server/**',
      '.next/serverless/**',
      '.next/*.json',
      '.next/BUILD_ID',
      '!../node_modules/next/dist/compiled/@ampproject/toolbox-optimizer/**/*',
      `!node_modules/next/dist/server/lib/squoosh/**/*.wasm`,
      `!node_modules/next/dist/next-server/server/lib/squoosh/**/*.wasm`,
      '!node_modules/next/dist/compiled/webpack/bundle4.js',
      '!node_modules/next/dist/compiled/webpack/bundle5.js',
      '!node_modules/next/dist/compiled/terser/bundle.min.js',
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
})

describe('onPostBuild', () => {
  test('saves cache with right paths', async () => {
    await useFixture('dist_dir_next_config')

    const save = jest.fn()

    await plugin.onPostBuild({
      ...defaultArgs,
      utils: { ...utils, cache: { save } },
    })

    expect(save).toHaveBeenCalledWith(path.posix.resolve('.next/cache'), {
      digests: [path.posix.resolve('.next/build-manifest.json')],
    })
  })
})
