/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
const path = require('path')
const process = require('process')

const cpy = require('cpy')
const pathExists = require('path-exists')
const { dir: getTmpDir } = require('tmp-promise')

const plugin = require('..')
const getNextConfig = require('../helpers/getNextConfig')
const resolveNextModule = require('../helpers/resolveNextModule')
const usesBuildCommand = require('../helpers/usesBuildCommand')

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
  cache: {
    save() {},
    restore() {},
  },
  status: {
    show() {},
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
  await cpy('**', process.cwd(), { cwd: fixtureDir, parents: true, overwrite: false, dot: true })
}

// In each test, we change cwd to a temporary directory.
// This allows us not to have to mock filesystem operations.
beforeEach(async () => {
  delete process.env.NEXT_PRIVATE_TARGET
  delete require.cache[resolveNextModule('next/dist/telemetry/ci-info', process.cwd())]
  delete require.cache[
    resolveNextModule(
      [
        //  next <= 11.0.1
        'next/dist/next-server/server/config',
        // next > 11.0.1
        'next/dist/server/config',
      ],
      process.cwd(),
    )
  ]

  getNextConfig.clear()
  const { path, cleanup } = await getTmpDir({ unsafeCleanup: true })
  const restoreCwd = changeCwd(path)
  Object.assign(this, { cleanup, restoreCwd })
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

const DUMMY_PACKAGE_JSON = { name: 'dummy', version: '1.0.0', scripts: { build: 'next build' } }
const netlifyConfig = { build: { command: 'npm run build' } }

describe('preBuild()', () => {
  test('fails if the build version is too old', async () => {
    expect(
      plugin.onPreBuild({
        netlifyConfig,
        packageJson: DUMMY_PACKAGE_JSON,
        utils,
        constants: { IS_LOCAL: true, NETLIFY_BUILD_VERSION: '15.11.4' },
      }),
    ).rejects.toThrow('This version of the Essential Next.js plugin requires netlify-cli@4.4.2 or higher')
  })

  test('passes if the build version is new enough', async () => {
    await plugin.onPreBuild({
      netlifyConfig,
      packageJson: DUMMY_PACKAGE_JSON,
      utils,
      constants: { IS_LOCAL: true, NETLIFY_BUILD_VERSION: '15.12.0' },
    })
    expect(process.env.NEXT_PRIVATE_TARGET).toBe('serverless')
  })

  test('do nothing if the app has no build command', async () => {
    await plugin.onPreBuild({
      netlifyConfig: { build: { command: '' } },
      packageJson: DUMMY_PACKAGE_JSON,
      utils,
      constants: { FUNCTIONS_SRC: 'out_functions' },
    })

    expect(await pathExists('next.config.js')).toBeFalsy()
  })

  test('do nothing if the app has static html export in npm script', async () => {
    await plugin.onPreBuild({
      netlifyConfig: { build: { command: 'npm run build' } },
      packageJson: { ...DUMMY_PACKAGE_JSON, scripts: { build: 'next export' } },
      utils,
      constants: { FUNCTIONS_SRC: 'out_functions' },
    })

    expect(await pathExists('next.config.js')).toBeFalsy()
  })

  test('run plugin if the app has next export in an unused script', async () => {
    await plugin.onPreBuild({
      netlifyConfig,
      packageJson: { ...DUMMY_PACKAGE_JSON, scripts: { export: 'next export', build: 'next build' } },
      utils,
      constants: {},
    })
    expect(process.env.NEXT_PRIVATE_TARGET).toBe('serverless')
  })

  test('do nothing if app has static html export in toml/ntl config', async () => {
    await plugin.onPreBuild({
      netlifyConfig: { build: { command: 'next build && next export' } },
      packageJson: DUMMY_PACKAGE_JSON,
      utils,
      constants: { FUNCTIONS_SRC: 'out_functions' },
    })

    expect(process.env.NEXT_PRIVATE_TARGET).toBeUndefined()
  })

  test('do nothing if app has next-on-netlify installed', async () => {
    const packageJson = {
      ...DUMMY_PACKAGE_JSON,
      dependencies: { 'next-on-netlify': '123' },
    }
    await plugin.onPreBuild({
      netlifyConfig,
      packageJson,
      utils,
    })

    expect(process.env.NEXT_PRIVATE_TARGET).toBeUndefined()
  })

  test('do nothing if app has next-on-netlify postbuild script', async () => {
    const packageJson = {
      scripts: { build: 'next build', postbuild: 'next-on-netlify' },
    }
    await plugin.onPreBuild({
      netlifyConfig,
      packageJson,
      utils,
    })

    expect(process.env.NEXT_PRIVATE_TARGET).toBeUndefined()
  })

  test('do nothing if build command includes "build-storybook"', async () => {
    await plugin.onPreBuild({
      netlifyConfig,
      packageJson: { ...DUMMY_PACKAGE_JSON, scripts: { build: 'build-storybook' } },
      utils,
    })
    expect(process.env.NEXT_PRIVATE_TARGET).toBeUndefined()
  })

  test('do nothing if build command calls a script that includes "build-storybook"', async () => {
    await plugin.onPreBuild({
      netlifyConfig: { build: { command: 'npm run storybook' } },
      packageJson: { ...DUMMY_PACKAGE_JSON, scripts: { storybook: 'build-storybook' } },
      utils,
    })
    expect(process.env.NEXT_PRIVATE_TARGET).toBeUndefined()
  })

  test('run plugin if app has build-storybook in an unused script', async () => {
    await plugin.onPreBuild({
      netlifyConfig,
      packageJson: { ...DUMMY_PACKAGE_JSON, scripts: { storybook: 'build-storybook', build: 'next build' } },
      utils,
    })
    expect(process.env.NEXT_PRIVATE_TARGET).toBe('serverless')
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
        packageJson: DUMMY_PACKAGE_JSON,
        utils,
        constants: { FUNCTIONS_SRC: 'out_functions' },
      }),
    ).rejects.toThrow(`Error loading your next.config.js.`)
  })

  test('restores cache with right paths', async () => {
    await useFixture('dist_dir_next_config')

    let distPath
    const utils_ = {
      ...utils,
      cache: {
        restore: (x) => (distPath = x),
      },
    }
    const spy = jest.spyOn(utils_.cache, 'restore')

    await plugin.onPreBuild({
      netlifyConfig,
      packageJson: DUMMY_PACKAGE_JSON,
      utils: utils_,
      constants: { FUNCTIONS_SRC: 'out_functions' },
    })

    expect(spy).toHaveBeenCalled()
    expect(path.normalize(distPath)).toBe(path.normalize('build/cache'))
  })
})

describe('onBuild()', () => {
  test('does not run onBuild if using next-on-netlify', async () => {
    const packageJson = {
      scripts: { postbuild: 'next-on-netlify', build: 'next build' },
    }
    await useFixture('publish_copy_files')
    await moveNextDist()
    const PUBLISH_DIR = 'publish'
    await plugin.onBuild({
      netlifyConfig,
      packageJson,
      constants: {},
      utils,
    })

    expect(await pathExists(`${PUBLISH_DIR}/index.html`)).toBeFalsy()
  })

  test('copy files to the publish directory', async () => {
    await useFixture('publish_copy_files')
    await moveNextDist()
    const PUBLISH_DIR = 'publish'
    await plugin.onBuild({
      netlifyConfig: { build: { publish: path.resolve(PUBLISH_DIR), command: 'next build' } },
      packageJson: DUMMY_PACKAGE_JSON,
      constants: {
        PUBLISH_DIR,
        FUNCTIONS_SRC: 'functions',
      },
      utils,
    })

    expect(await pathExists(`${PUBLISH_DIR}/_redirects`)).toBeTruthy()
    expect(await pathExists(`${PUBLISH_DIR}/index.html`)).toBeTruthy()
  })

  test.each([
    { FUNCTIONS_SRC: 'functions', resolvedFunctions: 'functions' },
    { FUNCTIONS_SRC: undefined, resolvedFunctions: 'netlify/functions' },
  ])('copy files to the functions directory', async ({ FUNCTIONS_SRC, resolvedFunctions }) => {
    await useFixture('functions_copy_files')
    await moveNextDist()
    await plugin.onBuild({
      netlifyConfig,
      packageJson: DUMMY_PACKAGE_JSON,
      constants: {
        FUNCTIONS_SRC,
        PUBLISH_DIR: '.',
      },
      utils,
    })

    expect(await pathExists(`${resolvedFunctions}/next_api_test/next_api_test.ts`)).toBeTruthy()
  })
})

describe('onPostBuild', () => {
  test('saves cache with right paths', async () => {
    await useFixture('dist_dir_next_config')

    let distPath
    let manifestPath
    const utils_ = {
      ...utils,
      cache: {
        save: (x, y) => {
          distPath = x
          manifestPath = y
        },
      },
    }
    const spy = jest.spyOn(utils_.cache, 'save')

    await plugin.onPostBuild({
      netlifyConfig,
      packageJson: DUMMY_PACKAGE_JSON,
      utils: utils_,
      constants: { FUNCTIONS_SRC: 'out_functions' },
    })

    expect(spy).toHaveBeenCalled()
    expect(path.normalize(distPath)).toBe(path.normalize('build/cache'))
    expect(path.normalize(manifestPath.digests[0])).toBe(path.normalize('build/build-manifest.json'))
  })
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

/* eslint-enable max-lines */
/* eslint-enable max-lines-per-function */
