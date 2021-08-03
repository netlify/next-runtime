// Test that next-on-netlify does not crash when pre-rendering index.js file.
// See: https://github.com/netlify/next-on-netlify/issues/2#issuecomment-636415494

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
      .withPages('pages-with-prerendered-index')
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
    expect(existsSync(join(OUTPUT_PATH, 'shows.html'))).toBe(true)
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
  test('adds next_image redirect only', async () => {
    // Read _redirects file
    const contents = readFileSync(join(PROJECT_PATH, 'out_publish', '_redirects'), 'utf-8')

    // Check that no redirects are present
    expect(contents).toMatchInlineSnapshot(`
      "# Next-on-Netlify Redirects
      /_ipx/*  /.netlify/functions/next_image  200
      /_next/image*  url=:url w=:width q=:quality  /_ipx/w_:width,q_:quality/:url?=  301!"
    `)
  })
})
