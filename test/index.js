const path = require('path')
const process = require('process')

const nextOnNetlify = require('next-on-netlify')
const pathExists = require('path-exists')
const { dir: getTmpDir } = require('tmp-promise')

const plugin = require('..')

const FIXTURES_DIR = `${__dirname}/fixtures`

const utils = {
  run: {
    command: jest.fn(),
  },
  build: {
    failBuild: jest.fn(),
  },
}

// Temporary switch cwd
const changeCwd = function (cwd) {
  const originalCwd = process.cwd()
  process.chdir(cwd)
  return process.chdir.bind(process, originalCwd)
}

// Switch cwd to a fixture directory
const useFixture = function (fixtureName) {
  const fixtureDir = `${FIXTURES_DIR}/${fixtureName}`
  const restoreCwd = changeCwd(fixtureDir)
  return { restoreCwd, fixtureDir }
}

// In each test, we change cwd to a temporary directory.
// This allows us not to have to mock filesystem operations.
beforeEach(async () => {
  const { path, cleanup } = await getTmpDir({ unsafeCleanup: true })
  const restoreCwd = changeCwd(path)
  Object.assign(this, { cleanup, restoreCwd })
})

afterEach(async () => {
  utils.build.failBuild.mockReset()
  utils.run.command.mockReset()
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
    await plugin.onPreBuild({
      netlifyConfig: {},
      packageJson: { ...DUMMY_PACKAGE_JSON, scripts: { build: 'next export' } },
      utils,
      constants: { FUNCTIONS_SRC: 'out_functions' },
    })

    expect(utils.build.failBuild.mock.calls[0][0]).toEqual(
      '** Static HTML export next.js projects do not require this plugin **',
    )
  })

  test('fail build if the app has static html export in toml/ntl config', async () => {
    const netlifyConfig = { build: { command: 'next build && next export' } }

    await plugin.onPreBuild({
      netlifyConfig,
      packageJson: DUMMY_PACKAGE_JSON,
      utils,
      constants: { FUNCTIONS_SRC: 'out_functions' },
    })

    expect(utils.build.failBuild.mock.calls[0][0]).toEqual(
      '** Static HTML export next.js projects do not require this plugin **',
    )
  })

  test('fail build if the app has no package.json', async () => {
    await plugin.onPreBuild({
      netlifyConfig: {},
      packageJson: {},
      utils,
      constants: { FUNCTIONS_SRC: 'out_functions' },
    })

    expect(utils.build.failBuild.mock.calls[0][0]).toEqual(`Could not find a package.json for this project`)
  })

  test('fail build if the app has no functions directory defined', async () => {
    await plugin.onPreBuild({
      netlifyConfig: {},
      packageJson: DUMMY_PACKAGE_JSON,
      utils,
      constants: {},
    })

    expect(utils.build.failBuild.mock.calls[0][0]).toEqual(
      `You must designate a functions directory named "out_functions" in your netlify.toml or in your app's build settings on Netlify. See docs for more info: https://docs.netlify.com/functions/configure-and-deploy/#configure-the-functions-folder`,
    )
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

  test(`fail build if the app's next config has an invalid target`, async () => {
    const { restoreCwd } = useFixture('invalid_next_config')
    await plugin.onPreBuild({
      netlifyConfig: {},
      packageJson: DUMMY_PACKAGE_JSON,
      utils,
      constants: { FUNCTIONS_SRC: 'out_functions' },
    })
    restoreCwd()

    const acceptableTargets = ['serverless', 'experimental-serverless-trace']
    expect(utils.build.failBuild.mock.calls[0][0]).toEqual(
      `next.config.js must be one of: ${acceptableTargets.join(', ')}`,
    )
  })
})

describe('onBuild()', () => {
  test('runs next on netlify', async () => {
    await plugin.onBuild({
      constants: {
        PUBLISH_DIR: '',
      },
    })

    expect(nextOnNetlify.mock.calls.length).toEqual(1)
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

  test('calls copySync with correct args', async () => {
    const { restoreCwd, fixtureDir } = useFixture('publish_copy_files')
    const PUBLISH_DIR = `${fixtureDir}/publish`
    await plugin.onBuild({
      constants: {
        PUBLISH_DIR,
      },
    })
    restoreCwd()

    expect(await pathExists(`${PUBLISH_DIR}/subdir/dummy.txt`)).toBeTruthy()
  })
})
