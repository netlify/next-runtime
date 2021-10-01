const { writeJSON, unlink, existsSync } = require('fs-extra')
const path = require('path')
const process = require('process')

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
  await cpy('.next/**', process.cwd(), { cwd: SAMPLE_PROJECT_DIR, parents: true, overwrite: false, dot: true })
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
// In each test, we change cwd to a temporary directory.
// This allows us not to have to mock filesystem operations.
beforeEach(async () => {
  delete process.env.NEXT_PRIVATE_TARGET

  const { path: tmpPath, cleanup } = await getTmpDir({ unsafeCleanup: true })
  const restoreCwd = changeCwd(tmpPath)
  Object.assign(this, { cleanup, restoreCwd })
  netlifyConfig.build.publish = path.join(process.cwd(), '.next')
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
  this.restoreCwd()
  await this.cleanup()
})

describe('preBuild()', () => {
  test('fails if publishing the root of the project', () => {
    defaultArgs.netlifyConfig.build.publish = process.cwd()
    expect(plugin.onPreBuild(defaultArgs)).rejects.toThrowError(
      /Your publish directory is pointing to the base directory of your site/,
    )
  })

  test('fails if the build version is too old', () => {
    expect(
      plugin.onPreBuild({
        ...defaultArgs,
        constants: { IS_LOCAL: true, NETLIFY_BUILD_VERSION: '15.11.4' },
      }),
    ).rejects.toThrow('This version of the Essential Next.js plugin requires netlify-cli@4.4.2 or higher')
  })

  test('passes if the build version is new enough', async () => {
    expect(
      plugin.onPreBuild({
        ...defaultArgs,
        constants: { IS_LOCAL: true, NETLIFY_BUILD_VERSION: '15.12.2' },
      }),
    ).resolves.not.toThrow()
  })

  it('restores cache with right paths', async () => {
    await useFixture('dist_dir_next_config')
    netlifyConfig.build.publish = path.join(process.cwd(), 'build')

    const restore = jest.fn()

    await plugin.onPreBuild({
      ...defaultArgs,
      utils: { ...utils, cache: { restore } },
    })

    expect(restore).toHaveBeenCalledWith(path.resolve('build/cache'))
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
})

describe('onPostBuild', () => {
  test('saves cache with right paths', async () => {
    await useFixture('dist_dir_next_config')

    const save = jest.fn()

    await plugin.onPostBuild({
      ...defaultArgs,
      utils: { ...utils, cache: { save } },
    })

    expect(save).toHaveBeenCalledWith(path.resolve('.next/cache'), {
      digests: [path.resolve('.next/build-manifest.json')],
    })
  })
})
