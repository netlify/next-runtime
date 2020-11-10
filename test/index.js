const path = require('path')
const nextOnNetlify = require('next-on-netlify')
const makef = require('makef')
const makeDir = require('make-dir')
const cpx = require('cpx')
const mockFs = require('mock-fs')
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

describe('preBuild()', () => {
  test('fail build if the app has static html export in npm script', async () => {
    const packageJson = { scripts: { build: 'next export' } }

    await plugin.onPreBuild({
      netlifyConfig: {},
      packageJson,
      utils,
    })

    expect(utils.build.failBuild.mock.calls[0][0]).toEqual(
      '** Static HTML export next.js projects do not require this plugin **',
    )
  })

  test('fail build if the app has static html export in toml/ntl config', async () => {
    const netlifyConfig = { build: { command: 'next build && next export' } }
    const packageJson = {}

    await plugin.onPreBuild({
      netlifyConfig,
      packageJson,
      utils,
    })

    expect(utils.build.failBuild.mock.calls[0][0]).toEqual(
      '** Static HTML export next.js projects do not require this plugin **',
    )
  })

  test('fail build if the app has no functions directory defined', async () => {
    const netlifyConfig = { build: {} }
    const packageJson = {}

    await plugin.onPreBuild({
      netlifyConfig,
      packageJson,
      utils,
    })

    expect(utils.build.failBuild.mock.calls[0][0]).toEqual(
      `You must designate a functions directory named "out_functions" in your netlify.toml or in your app's build settings on Netlify. See docs for more info: https://docs.netlify.com/functions/configure-and-deploy/#configure-the-functions-folder`,
    )
  })

  test('create next.config.js with correct target if file does not exist', async () => {
    await plugin.onPreBuild({
      netlifyConfig: {},
      packageJson: {},
      utils,
    })

    expect(makef.createFile.mock.calls.length).toEqual(1)
  })

  test(`fail build if the app's next config has an invalid target`, async () => {
    const netlifyConfig = { build: { functions: path.resolve('out_functions') } }
    mockFs({
      'next.config.js': {
        target: 'nonsense',
      },
    })

    await plugin.onPreBuild({
      netlifyConfig,
      packageJson: {},
      utils,
    })

    mockFs.restore()

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
