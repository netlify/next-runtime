// Test that next-on-netlify does not crash when pre-rendering index.js file.
// See: https://github.com/netlify/next-on-netlify/issues/2#issuecomment-636415494

const { parse, join } = require('path')
const { readFileSync } = require('fs-extra')
const buildNextApp = require('./helpers/buildNextApp')

// The name of this test file (without extension)
const FILENAME = parse(__filename).name

// The directory which will be used for testing.
// We simulate a NextJS app within that directory, with pages, and a
// package.json file.
const PROJECT_PATH = join(__dirname, 'builds', FILENAME)

// The directory that contains the fixtures, such as NextJS pages,
// NextJS config, and package.json
const FIXTURE_PATH = join(__dirname, 'fixtures')

// Capture the output to verify successful build
let buildOutput

beforeAll(
  async () => {
    buildOutput = await buildNextApp()
      .forTest(__filename)
      .withPages('pages-with-optionalCatchAll')
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

describe('Routing', () => {
  test('creates Netlify redirects', async () => {
    // Read _redirects file
    const contents = readFileSync(join(PROJECT_PATH, 'out_publish', '_redirects'))
    let redirects = contents.toString()

    // Replace non-persistent build ID with placeholder
    redirects = redirects.replace(/\/_next\/data\/[^\/]+\//g, '/_next/data/%BUILD_ID%/')

    // Check that redirects match
    expect(redirects).toMatchSnapshot()
  })
})
