const fs = require('fs')
const path = require('path')
const process = require('process')
const { promisify } = require('util')

const { copy } = require('cpx')
const nextOnNetlify = require('next-on-netlify')
const pathExists = require('path-exists')
const { dir: getTmpDir } = require('tmp-promise')

const plugin = require('..')

const pCopy = promisify(copy)

const FIXTURES_DIR = `${__dirname}/fixtures`

const utils = {
  run: {
    command() {},
  },
  build: {
    failBuild(message) {
      throw new Error(message)
    },
  },
}

// Temporary switch cwd
const changeCwd = function (cwd) {
  const originalCwd = process.cwd()
  process.chdir(cwd)
  return process.chdir.bind(process, originalCwd)
}

// Copy fixture files to the current directory
const useFixture = async function (fixtureName) {
  const fixtureDir = `${FIXTURES_DIR}/${fixtureName}`
  await pCopy(`${fixtureDir}/**`, process.cwd())
}

// In each test, we change cwd to a temporary directory.
// This allows us not to have to mock filesystem operations.
beforeEach(async () => {
  const { path, cleanup } = await getTmpDir({ unsafeCleanup: true })
  const restoreCwd = changeCwd(path)
  Object.assign(this, { cleanup, restoreCwd })
})

afterEach(async () => {
  jest.clearAllMocks()
  jest.resetAllMocks()

  // Cleans up the temporary directory from `getTmpDir()` and do not make it
  // the current directory anymore
  this.restoreCwd()
  await this.cleanup()
})

jest.mock('next-on-netlify')

const DUMMY_PACKAGE_JSON = { name: 'dummy', version: '1.0.0' }

describe('preBuild()', () => {
  test('fail build if the app has static html export in npm script', async () => {
    await expect(
      plugin.onPreBuild({
        netlifyConfig: {},
        packageJson: { ...DUMMY_PACKAGE_JSON, scripts: { build: 'next export' } },
        utils,
        constants: { FUNCTIONS_SRC: 'out_functions' },
      }),
    ).rejects.toThrow('** Static HTML export next.js projects do not require this plugin **')
  })

  test('fail build if the app has static html export in toml/ntl config', async () => {
    await expect(
      plugin.onPreBuild({
        netlifyConfig: { build: { command: 'next build && next export' } },
        packageJson: DUMMY_PACKAGE_JSON,
        utils,
        constants: { FUNCTIONS_SRC: 'out_functions' },
      }),
    ).rejects.toThrow('** Static HTML export next.js projects do not require this plugin **')
  })

  test('fail build if app has next-on-netlify installed', async () => {
    const packageJson = {
      dependencies: { 'next-on-netlify': '123' },
    }
    await expect(
      plugin.onPreBuild({
        netlifyConfig: {},
        packageJson,
        utils,
      }),
    ).rejects.toThrow(
      `This plugin does not support sites that manually use next-on-netlify. Uninstall next-on-netlify as a dependency to resolve.`,
    )
  })

  test('fail build if app has next-on-netlify postbuild script', async () => {
    const packageJson = {
      scripts: { postbuild: 'next-on-netlify' },
    }
    await expect(
      plugin.onPreBuild({
        netlifyConfig: {},
        packageJson,
        utils,
      }),
    ).rejects.toThrow(
      `This plugin does not support sites that manually use next-on-netlify. Uninstall next-on-netlify as a dependency to resolve.`,
    )
  })

  test('fail build if the app has no package.json', async () => {
    await expect(
      plugin.onPreBuild({
        netlifyConfig: {},
        packageJson: {},
        utils,
        constants: { FUNCTIONS_SRC: 'out_functions' },
      }),
    ).rejects.toThrow(`Could not find a package.json for this project`)
  })

  test('create next.config.js with correct target if file does not exist', async () => {
    await plugin.onPreBuild({
      netlifyConfig: {},
      packageJson: DUMMY_PACKAGE_JSON,
      utils,
      constants: { FUNCTIONS_SRC: 'out_functions' },
    })

    expect(await pathExists('next.config.js')).toBeTruthy()
  })

  test.each(['invalid_next_config', 'deep_invalid_next_config'])(
    `fail build if the app's next config has an invalid target`,
    async (fixtureName) => {
      await useFixture(fixtureName)
      await expect(
        plugin.onPreBuild({
          netlifyConfig: {},
          packageJson: DUMMY_PACKAGE_JSON,
          utils,
          constants: { FUNCTIONS_SRC: 'out_functions' },
        }),
      ).rejects.toThrow(`next.config.js must be one of: serverless, experimental-serverless-trace`)
    },
  )
})

describe('onBuild()', () => {
  test('runs NoN with functions_src & publish_dir options', async () => {
    const PUBLISH_DIR = 'some/path'
    const FUNCTIONS_SRC = 'other/path'
    await plugin.onBuild({
      constants: {
        PUBLISH_DIR,
        FUNCTIONS_SRC,
      },
    })

    const nextOnNetlifyOptions = nextOnNetlify.mock.calls[0][0]
    expect(nextOnNetlifyOptions.functionsDir).toEqual(FUNCTIONS_SRC)
    expect(nextOnNetlifyOptions.publishDir).toEqual(PUBLISH_DIR)
  })

  test('runs NoN with publish_dir option only', async () => {
    const defaultFunctionsSrc = 'netlify-automatic-functions'
    const PUBLISH_DIR = 'some/path'
    await plugin.onBuild({
      constants: {
        PUBLISH_DIR,
      },
    })

    const nextOnNetlifyOptions = nextOnNetlify.mock.calls[0][0]
    expect(nextOnNetlifyOptions.functionsDir).toEqual(defaultFunctionsSrc)
    expect(nextOnNetlifyOptions.publishDir).toEqual(PUBLISH_DIR)
  })

  test('calls makeDir with correct path', async () => {
    const PUBLISH_DIR = 'some/path'
    await plugin.onBuild({
      constants: {
        PUBLISH_DIR,
      },
    })

    expect(await pathExists(PUBLISH_DIR)).toBeTruthy()
  })
})
