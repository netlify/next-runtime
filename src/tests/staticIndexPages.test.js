// Test that next-on-netlify does not crash when pre-rendering index.js file
// with getStaticProps.

const { parse, join } = require('path')

const { existsSync, readdirSync, readFileSync } = require('fs-extra')

const buildNextApp = require('./helpers/buildNextApp')

// The name of this test file (without extension)
const FILENAME = parse(__filename).name

// The directory which will be used for testing.
// We simulate a NextJS app within that directory, with pages, and a
// package.json file.
const PROJECT_PATH = join(__dirname, 'builds', FILENAME)

// Capture the output to verify successful build
let buildOutput

beforeAll(
  async () => {
    buildOutput = await buildNextApp()
      .forTest(__filename)
      .withPages('pages-with-static-props-index')
      .withNextConfig('next.config.js')
      .withPackageJson('package.json')
      .build()
  },
  // time out after 180 seconds
  180 * 1000,
)

describe('next-on-netlify', () => {
  test('builds successfully', () => {
    expect(buildOutput).toMatch('Next on Netlify')
    expect(buildOutput).toMatch('Success! All done!')
  })
})

describe('Static Pages', () => {
  test('copies static pages to output directory', () => {
    const OUTPUT_PATH = join(PROJECT_PATH, 'out_publish')

    expect(existsSync(join(OUTPUT_PATH, 'index.html'))).toBe(true)
    expect(existsSync(join(OUTPUT_PATH, 'static.html'))).toBe(true)
  })

  test('copies static assets to out_publish/_next/ directory', () => {
    const dirs = readdirSync(join(PROJECT_PATH, 'out_publish', '_next', 'static'))

    expect(dirs.length).toBe(2)
    expect(dirs).toContain('chunks')
  })
})

describe('404 Page', () => {
  test('copies 404.html to output directory', () => {
    const OUTPUT_PATH = join(PROJECT_PATH, 'out_publish')

    expect(existsSync(join(OUTPUT_PATH, '404.html'))).toBe(true)
  })
})

describe('Routing', () => {
  test('creates preview mode redirects for index and static routes', () => {
    // Read _redirects file
    let contents = readFileSync(join(PROJECT_PATH, 'out_publish', '_redirects')).toString()

    // Replace non-persistent build ID with placeholder
    contents = contents.replace(/\/_next\/data\/[^/]+\//g, '/_next/data/%BUILD_ID%/')

    const redirects = contents.trim().split(/\n/)

    expect(redirects[0]).toEqual('# Next-on-Netlify Redirects')
    expect(redirects[1]).toEqual(
      '/  /.netlify/functions/next_index  200!  Cookie=__prerender_bypass,__next_preview_data',
    )
    expect(redirects[2]).toEqual(
      '/_next/data/%BUILD_ID%/index.json  /.netlify/functions/next_index  200!  Cookie=__prerender_bypass,__next_preview_data',
    )
    expect(redirects[3]).toEqual(
      '/_next/data/%BUILD_ID%/static.json  /.netlify/functions/next_static  200!  Cookie=__prerender_bypass,__next_preview_data',
    )
    expect(redirects[4]).toEqual(
      '/static  /.netlify/functions/next_static  200!  Cookie=__prerender_bypass,__next_preview_data',
    )
  })
})
