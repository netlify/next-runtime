const path = require('path')
const process = require('process')
const nextOnNetlify = require('next-on-netlify')
const makef = require('makef')
const makeDir = require('make-dir')
const cpx = require('cpx')
const plugin = require('../index')

const utils = {
  run: {
    command: jest.fn(),
  },
  build: {
    failBuild: jest.fn(),
  },
}

afterEach(() => {
  utils.build.failBuild.mockReset()
  utils.run.command.mockReset()
  jest.clearAllMocks()
  jest.resetAllMocks()
})

jest.mock('next-on-netlify')
jest.mock('makef')
jest.mock('make-dir')
jest.mock('cpx')

// See: https://github.com/tschaub/mock-fs/issues/234#issuecomment-377862172
// for why this log is required
console.log('Initializing tests')

const DUMMY_PACKAGE_JSON = { name: 'dummy', version: '1.0.0' }

const FIXTURES_DIR = `${__dirname}/fixtures`

const useFixture = function (fixtureName) {
  const originalCwd = process.cwd()
  process.chdir(`${FIXTURES_DIR}/${fixtureName}`)
  return process.chdir.bind(process, originalCwd)
}

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

    expect(makef.createFile.mock.calls.length).toEqual(1)
  })

  test(`fail build if the app's next config has an invalid target`, async () => {
    const restoreCwd = useFixture('invalid_next_config')

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

    expect(makeDir.mock.calls[0][0]).toEqual(PUBLISH_DIR)
  })

  test('calls copySync with correct args', async () => {
    const PUBLISH_DIR = 'some/path'
    await plugin.onBuild({
      constants: {
        PUBLISH_DIR,
      },
    })

    expect(cpx.copySync.mock.calls[0][0]).toEqual('out_publish/**/*', PUBLISH_DIR)
  })
})
