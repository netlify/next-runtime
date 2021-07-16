// Test next-on-netlify when config is set from a function in next.config.js
// See: https://github.com/netlify/next-on-netlify/issues/25

const { parse, join } = require('path')
const { existsSync, readdirSync, readFileSync } = require('fs-extra')
const buildNextApp = require('./helpers/buildNextApp')

// The name of this test file (without extension)
const FILENAME = parse(__filename).name

// The directory which will be used for testing.
// We simulate a NextJS app within that directory, with pages, and a
// package.json file.
const PROJECT_PATH = join(__dirname, 'builds', FILENAME)
const FUNCTIONS_DIR = 'my-functions'
const PUBLISH_DIR = 'my-publish'

// Capture the output to verify successful build
let runOutput

beforeAll(
  async () => {
    runOutput = await buildNextApp()
      .forTest(__filename)
      .withPages('pages')
      .withNextConfig('next.config.js')
      .withPackageJson('package.json')
      .withCustomFunctions('my-functions')
      .withFileTracking()
      .runWithRequire({ functionsDir: FUNCTIONS_DIR, publishDir: PUBLISH_DIR })
  },
  // time out after 180 seconds
  180 * 1000,
)

describe('next-on-netlify', () => {
  const functionsDir = join(PROJECT_PATH, FUNCTIONS_DIR)

  test('builds successfully', () => {
    expect(runOutput).toMatch('Built successfully!')
  })

  test('copies custom Netlify Function to configured functions directory', () => {
    expect(existsSync(join(functionsDir, 'someTestFunction.js'))).toBe(true)
  })

  test('creates a Netlify Function for each SSR page', () => {
    expect(existsSync(join(functionsDir, 'next_index', 'next_index.ts'))).toBe(true)
    expect(existsSync(join(functionsDir, 'next_shows_id', 'next_shows_id.ts'))).toBe(true)
    expect(existsSync(join(functionsDir, 'next_shows_params', 'next_shows_params.ts'))).toBe(true)
    expect(existsSync(join(functionsDir, 'next_getServerSideProps_static', 'next_getServerSideProps_static.ts'))).toBe(
      true,
    )
    expect(existsSync(join(functionsDir, 'next_getServerSideProps_id', 'next_getServerSideProps_id.ts'))).toBe(true)
  })

  test('copies static pages to output directory', () => {
    const OUTPUT_PATH = join(PROJECT_PATH, PUBLISH_DIR)

    expect(existsSync(join(OUTPUT_PATH, 'static.html'))).toBe(true)
    expect(existsSync(join(OUTPUT_PATH, 'static/[id].html'))).toBe(true)
  })

  test('copies static assets to out_publish/_next/ directory', () => {
    const dirs = readdirSync(join(PROJECT_PATH, PUBLISH_DIR, '_next', 'static'))

    expect(dirs.length).toBe(2)
    expect(dirs).toContain('chunks')
  })
})

describe('clean up of NoN files', () => {
  test('creates a .nonfiletracking to audit NoN-specific files between builds', () => {
    const cacheDir = join(PROJECT_PATH, '/node_modules/.cache/next-on-netlify')
    const dirs = readdirSync(cacheDir)
    expect(dirs[0]).toEqual('.nonfiletracking')
  })

  test('.nonfiletracking contains NoN-specific files', () => {
    const cacheDir = join(PROJECT_PATH, '/node_modules/.cache/next-on-netlify')
    const fileList = readFileSync(join(cacheDir, '.nonfiletracking'), 'utf8')
    // had to test equality this way because of windows :)
    const isSameList = (arr1, arr2) =>
      arr1.reduce((isSame, func) => {
        if (arr2.includes(func)) {
          isSame = true
        } else {
          isSame = false
        }
        return isSame
      }, true)
    const nextFunctions = [
      'next_api_shows_id',
      'next_api_shows_params',
      'next_api_static',
      'next_getServerSideProps_all_slug',
      'next_getServerSideProps_id',
      'next_getServerSideProps_static',
      'next_getStaticProps_id',
      'next_getStaticProps_static',
      'next_getStaticProps_withFallback_id',
      'next_getStaticProps_withFallback_slug',
      'next_getStaticProps_withRevalidate_id',
      'next_getStaticProps_withRevalidate_withFallback_id',
      'next_getStaticProps_withrevalidate',
      'next_index',
      'next_shows_id',
      'next_shows_params',
    ]
    const fileListFunctions = fileList.split('---')[0].split('\n')
    expect(isSameList(nextFunctions, fileListFunctions)).toBe(true)
    expect(fileListFunctions.includes('someTestFunction.js')).toBe(false)
    const publishFiles = ['404.html', '_next', '_redirects', 'getStaticProps', 'static', 'static.html']
    const fileListPublish = fileList.split('---')[1].split('\n')
    expect(isSameList(publishFiles, fileListPublish)).toBe(true)
  })
})
