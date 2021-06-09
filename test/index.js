const path = require('path')
const process = require('process')
const pathExists = require('path-exists')
const { dir: getTmpDir } = require('tmp-promise')
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
const netlifyConfig = { build: {} }

describe('preBuild()', () => {
  test('create next.config.js with correct target if file does not exist', async () => {
    await plugin.onPreBuild({
      netlifyConfig,
      packageJson: DUMMY_PACKAGE_JSON,
      utils,
      constants: { FUNCTIONS_SRC: 'out_functions' },
    })

    expect(await pathExists('next.config.js')).toBeTruthy()
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
      packageJson: { ...DUMMY_PACKAGE_JSON, scripts: { export: 'next export' } },
      utils,
      constants: {},
    })

    expect(await pathExists('next.config.js')).toBeTruthy()
  })

  test('do nothing if app has static html export in toml/ntl config', async () => {
    await plugin.onPreBuild({
      netlifyConfig: { build: { command: 'next build && next export' } },
      packageJson: DUMMY_PACKAGE_JSON,
      utils,
      constants: { FUNCTIONS_SRC: 'out_functions' },
    })

    expect(await pathExists('next.config.js')).toBeFalsy()
  })

  test('do nothing if app has next-on-netlify installed', async () => {
    const packageJson = {
      dependencies: { 'next-on-netlify': '123' },
    }
    await plugin.onPreBuild({
      netlifyConfig,
      packageJson,
      utils,
    })

    expect(await pathExists('next.config.js')).toBeFalsy()
  })

  test('do nothing if app has next-on-netlify postbuild script', async () => {
    const packageJson = {
      scripts: { postbuild: 'next-on-netlify' },
    }
    await plugin.onPreBuild({
      netlifyConfig,
      packageJson,
      utils,
    })

    expect(await pathExists('next.config.js')).toBeFalsy()
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
      scripts: { postbuild: 'next-on-netlify' },
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

  test.each(['invalid_next_config', 'deep_invalid_next_config'])(
    `do nothing if the app's next config has an invalid target`,
    async (fixtureName) => {
      await useFixture(fixtureName)
      const PUBLISH_DIR = 'publish'
      await plugin.onBuild({
        netlifyConfig,
        packageJson: DUMMY_PACKAGE_JSON,
        utils,
        constants: { FUNCTIONS_SRC: 'out_functions' },
        utils,
      })

      expect(await pathExists(`${PUBLISH_DIR}/index.html`)).toBeFalsy()
    },
  )

  test('copy files to the publish directory', async () => {
    await useFixture('publish_copy_files')
    await moveNextDist()
    const PUBLISH_DIR = 'publish'
    await plugin.onBuild({
      netlifyConfig,
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

    expect(await pathExists(`${resolvedFunctions}/next_api_test/next_api_test.js`)).toBeTruthy()
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
