const path = require('path')
const process = require('process')
const nextOnNetlify = require('next-on-netlify')
const pathExists = require('path-exists')
const { dir: getTmpDir } = require('tmp-promise')
const execa = require('execa')
const cpy = require('cpy')

const plugin = require('..')

const FIXTURES_DIR = `${__dirname}/fixtures`
const SAMPLE_PROJECT_DIR = `${__dirname}/sample`

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

// Move .next from sample project to current directory
const moveNextDist = async function () {
  await cpy('.next/**', process.cwd(), { cwd: SAMPLE_PROJECT_DIR, parents: true, overwrite: false, dot: true })
}

// Copy fixture files to the current directory
const useFixture = async function (fixtureName) {
  const fixtureDir = `${FIXTURES_DIR}/${fixtureName}`
  await cpy('**', process.cwd(), { cwd: fixtureDir, parents: true, overwrite: false, dot: true })
}

// Build the sample project before running the tests
beforeAll(async () => {
  await execa('next', ['build'], {
    cwd: SAMPLE_PROJECT_DIR,
    preferLocal: true,
  })
}, 180 * 1000) // timeout after 180 seconds

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
  test('copy files to the publish directory', async () => {
    await useFixture('publish_copy_files')
    await moveNextDist()
    const PUBLISH_DIR = 'publish'
    await plugin.onBuild({
      constants: {
        PUBLISH_DIR,
        FUNCTIONS_SRC: 'functions',
      },
    })

    expect(await pathExists(`${PUBLISH_DIR}/_redirects`)).toBeTruthy()
    expect(await pathExists(`${PUBLISH_DIR}/index.html`)).toBeTruthy()
  })

  test.each([
    { FUNCTIONS_SRC: 'functions', resolvedFunctions: 'functions' },
    { FUNCTIONS_SRC: undefined, resolvedFunctions: 'netlify-automatic-functions' },
  ])('copy files to the functions directory', async ({ FUNCTIONS_SRC, resolvedFunctions }) => {
    await useFixture('functions_copy_files')
    await moveNextDist()
    await plugin.onBuild({
      constants: {
        FUNCTIONS_SRC,
        PUBLISH_DIR: '.',
      },
    })

    expect(await pathExists(`${resolvedFunctions}/next_api_test/next_api_test.js`)).toBeTruthy()
  })
})
