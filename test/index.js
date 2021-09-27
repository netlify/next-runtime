/* eslint-disable max-lines, max-nested-callbacks,  max-lines-per-function */
const { readdirSync } = require('fs')
const path = require('path')
const process = require('process')

const cpy = require('cpy')
const pathExists = require('path-exists')
const { dir: getTmpDir } = require('tmp-promise')

const plugin = require('..')
const getNextConfig = require('../src/helpers/getNextConfig')
// const resolveNextModule = require('../src/helpers/resolveNextModule')
const usesBuildCommand = require('../src/helpers/usesBuildCommand')

const FIXTURES_DIR = `${__dirname}/fixtures`
const SAMPLE_PROJECT_DIR = `${__dirname}/sample`

const utils = {
  build: {
    failBuild(message) {
      throw new Error(message)
    },
  },
  cache: {
    save() {},
    restore() {},
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

// Move .next from sample project to current directory
const moveNextDist = async function () {
  await cpy('.next/**', process.cwd(), { cwd: SAMPLE_PROJECT_DIR, parents: true, overwrite: false, dot: true })
}

// Copy fixture files to the current directory
const useFixture = async function (fixtureName) {
  const fixtureDir = `${FIXTURES_DIR}/${fixtureName}`
  await cpy('**', process.cwd(), { cwd: fixtureDir, parents: true, overwrite: true, dot: true })
}

const packageJson = { name: 'dummy', version: '1.0.0', scripts: { build: 'next build' } }
const netlifyConfig = { build: { command: 'npm run build' }, functions: {}, redirects: [] }

// In each test, we change cwd to a temporary directory.
// This allows us not to have to mock filesystem operations.
beforeEach(async () => {
  delete process.env.NEXT_PRIVATE_TARGET

  // delete require.cache[resolveNextModule('next/dist/telemetry/ci-info', process.cwd())]
  // delete require.cache[
  //   resolveNextModule(
  //     [
  //       //  next <= 11.0.1
  //       'next/dist/next-server/server/config',
  //       // next > 11.0.1
  //       'next/dist/server/config',
  //     ],
  //     process.cwd(),
  //   )
  // ]

  getNextConfig.clear()
  const { path: tmpPath, cleanup } = await getTmpDir({ unsafeCleanup: true })
  const restoreCwd = changeCwd(tmpPath)
  Object.assign(this, { cleanup, restoreCwd })
  netlifyConfig.build.publish = path.join(process.cwd(), '.next')
  netlifyConfig.redirects = []
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
  test('fails if the build version is too old', () => {
    expect(
      plugin.onPreBuild({
        netlifyConfig,
        packageJson,
        utils,
        constants: { IS_LOCAL: true, NETLIFY_BUILD_VERSION: '15.11.4' },
      }),
    ).rejects.toThrow('This version of the Essential Next.js plugin requires netlify-cli@4.4.2 or higher')
  })

  test('passes if the build version is new enough', async () => {
    await plugin.onPreBuild({
      netlifyConfig,
      packageJson,
      utils,
      constants: { IS_LOCAL: true, NETLIFY_BUILD_VERSION: '15.12.0' },
    })
    expect(process.env.NEXT_PRIVATE_TARGET).toBe('server')
  })

  test('do nothing if the app has no build command', async () => {
    await plugin.onPreBuild({
      netlifyConfig: { build: { command: '' } },
      packageJson,
      utils,
      constants: { FUNCTIONS_SRC: 'out_functions' },
    })

    expect(process.env.NEXT_PRIVATE_TARGET).toBeUndefined()
  })

  test('do nothing if the app has static html export in npm script', async () => {
    await plugin.onPreBuild({
      netlifyConfig: { build: { command: 'npm run build' } },
      packageJson: { ...packageJson, scripts: { build: 'next export' } },
      utils,
      constants: { FUNCTIONS_SRC: 'out_functions' },
    })

    expect(process.env.NEXT_PRIVATE_TARGET).toBeUndefined()
  })

  test('run plugin if `NEXT_PLUGIN_FORCE_RUN` is set to true, even if next export is in script', async () => {
    process.env.NEXT_PLUGIN_FORCE_RUN = 'true'
    await plugin.onPreBuild({
      netlifyConfig,
      packageJson: { ...packageJson, scripts: { build: 'next export' } },
      utils,
      constants: {},
    })
    expect(process.env.NEXT_PRIVATE_TARGET).toBe('server')
    process.env.NEXT_PLUGIN_FORCE_RUN = undefined
  })

  test('run plugin if `NEXT_PLUGIN_FORCE_RUN` is set to true, even if build-storybook is in script', async () => {
    process.env.NEXT_PLUGIN_FORCE_RUN = 'true'
    await plugin.onPreBuild({
      netlifyConfig,
      packageJson: { ...packageJson, scripts: { build: 'build-storybook' } },
      utils,
      constants: {},
    })
    expect(process.env.NEXT_PRIVATE_TARGET).toBe('server')
    process.env.NEXT_PLUGIN_FORCE_RUN = undefined
  })

  test('not run plugin if `NEXT_PLUGIN_FORCE_RUN` is set to false', async () => {
    process.env.NEXT_PLUGIN_FORCE_RUN = 'false'
    await plugin.onPreBuild({
      netlifyConfig,
      packageJson,
      utils,
      constants: {},
    })
    expect(process.env.NEXT_PRIVATE_TARGET).toBeUndefined()
    process.env.NEXT_PLUGIN_FORCE_RUN = undefined
  })

  test('do nothing if build command includes "build-storybook"', async () => {
    await plugin.onPreBuild({
      netlifyConfig,
      packageJson: { ...packageJson, scripts: { build: 'build-storybook' } },
      utils,
      constants: {},
    })
    expect(process.env.NEXT_PRIVATE_TARGET).toBeUndefined()
  })

  test('do nothing if build command calls a script that includes "build-storybook"', async () => {
    await plugin.onPreBuild({
      netlifyConfig: { build: { command: 'npm run storybook' } },
      packageJson: { ...packageJson, scripts: { storybook: 'build-storybook' } },
      utils,
      constants: {},
    })
    expect(process.env.NEXT_PRIVATE_TARGET).toBeUndefined()
  })

  test('run plugin if app has build-storybook in an unused script', async () => {
    await plugin.onPreBuild({
      netlifyConfig,
      packageJson: { ...packageJson, scripts: { storybook: 'build-storybook', build: 'next build' } },
      utils,
      constants: {},
    })
    expect(process.env.NEXT_PRIVATE_TARGET).toBe('server')
  })

  test('fail build if the app has no package.json', async () => {
    await expect(
      plugin.onPreBuild({
        netlifyConfig,
        packageJson: {},
        utils,
        constants: { FUNCTIONS_SRC: 'out_functions' },
      }),
    ).rejects.toThrow(`Could not find a package.json for this project`)
  })

  test('fail build if the app cant load the next.config.js', async () => {
    await useFixture('broken_next_config')

    await expect(
      plugin.onPreBuild({
        netlifyConfig,
        packageJson,
        utils,
        constants: { FUNCTIONS_SRC: 'out_functions' },
      }),
    ).rejects.toThrow(`Error loading your next.config.js.`)
  })

  test('runs if correct custom publish dir', async () => {
    await plugin.onPreBuild({
      netlifyConfig, // defaulted correctly in beforeEach
      packageJson,
      constants: {},
      utils,
    })

    expect(process.env.NEXT_PRIVATE_TARGET).toBe('server')
  })

  test('fail build if wrong custom publish dir', async () => {
    const wrongPublishDir = path.join(process.cwd(), 'random', 'nonsense')

    expect(
      plugin.onPreBuild({
        netlifyConfig: { build: { command: 'npm run build', publish: wrongPublishDir } },
        packageJson,
        constants: {},
        utils,
      })
    ).rejects.toThrow(`You set your publish directory to "${wrongPublishDir}". Your publish directory should be set to your distDir (defaults to .next or is configured in your next.config.js). If your site is rooted in a subdirectory, your publish directory should be {yourSiteRoot}/{distDir}.`)
  })

  test('fail build if no  publish dir', async () => {
    expect(
      plugin.onPreBuild({
        netlifyConfig: { build: { command: 'npm run build', publish: null } },
        packageJson,
        constants: {},
        utils,
      })
    ).rejects.toThrow('You set your publish directory to "null". Your publish directory should be set to your distDir (defaults to .next or is configured in your next.config.js). If your site is rooted in a subdirectory, your publish directory should be {yourSiteRoot}/{distDir}.')
  })

  // test('restores cache with right paths', async () => {
  //   await useFixture('dist_dir_next_config')

  //   const restore = jest.fn()

  //   await plugin.onPreBuild({
  //     netlifyConfig,
  //     packageJson: DUMMY_PACKAGE_JSON,
  //     utils: { ...utils, cache: { restore } },
  //     constants: { FUNCTIONS_SRC: 'out_functions' },
  //   })

  //   expect(restore).toHaveBeenCalledWith(path.resolve('build/cache'))
  // })
})

describe('onBuild()', () => {
  test('copy handlers to the internal functions directory', async () => {
    await moveNextDist()

    const INTERNAL_FUNCTIONS_SRC = path.resolve(`.netlify/internal-functions`)

    await plugin.onBuild({
      netlifyConfig,
      packageJson,
      constants: { INTERNAL_FUNCTIONS_SRC },
      utils,
    })

    expect(await pathExists(path.resolve(`.netlify/internal-functions/___netlify-handler/___netlify-handler.js`))).toBeTruthy()
    expect(await pathExists(path.resolve(`.netlify/internal-functions/___netlify-handler/bridge.js`))).toBeTruthy()
    expect(await pathExists(path.resolve(`.netlify/internal-functions/___netlify-odb-handler/___netlify-odb-handler.js`))).toBeTruthy()
    expect(await pathExists(path.resolve(`.netlify/internal-functions/___netlify-odb-handler/bridge.js`))).toBeTruthy()
  })

  test('writes correct redirects to netlifyConfig', async () => {
    await moveNextDist()

    await plugin.onBuild({
      netlifyConfig,
      packageJson,
      constants: {},
      utils,
    })

    const redirects = netlifyConfig.redirects.reduce((acc, curr) => {
      const { from, to, status } = curr
      return acc + `${from} ${to} ${status}\n`
    }, '')
    expect(redirects).toMatchSnapshot()
  })

  test('publish dir is/has next dist', async () => {
    await moveNextDist()

    await plugin.onBuild({
      netlifyConfig,
      packageJson,
      constants: {},
      utils,
    })
    expect(await pathExists(path.resolve('.next/prerender-manifest.json'))).toBeTruthy()
  })
})

describe('onPostBuild', () => {
  // test('saves cache with right paths', async () => {
  //   await useFixture('dist_dir_next_config')

  //   const save = jest.fn()

  //   await plugin.onPostBuild({
  //     netlifyConfig,
  //     packageJson: DUMMY_PACKAGE_JSON,
  //     utils: { ...utils, cache: { save } },
  //     constants: { FUNCTIONS_SRC: 'out_functions' },
  //   })

  //   expect(save).toHaveBeenCalledWith(path.resolve('build/cache'), {
  //     digests: [path.resolve('build/build-manifest.json')],
  //   })
  // })
})

describe('script parser', () => {
  test('detects export commands', () => {
    const fixtures = require('./fixtures/static.json')
    fixtures.forEach(({ command, scripts }) => {
      const isStatic = usesBuildCommand({ command: 'next export', build: { command }, scripts })
      expect(isStatic).toBe(true)
    })
  })
  test('ignores non export commands', () => {
    const fixtures = require('./fixtures/not-static.json')
    fixtures.forEach(({ command, scripts }) => {
      const isStatic = usesBuildCommand({ command: 'next export', build: { command }, scripts })
      expect(isStatic).toBe(false)
    })
  })
})

/* eslint-enable max-lines, max-nested-callbacks,  max-lines-per-function */
