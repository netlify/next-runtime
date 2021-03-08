// Test that next-on-netlify does not crash with a getServerSideProps index.js file.
// See: https://github.com/netlify/next-on-netlify/pull/39

const { parse, join } = require('path')
const { readFileSync } = require('fs-extra')
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
      .withPages('pages-with-gssp-index')
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
  test('it routes page and data route to Netlify Function', async () => {
    // Read _redirects file
    let contents = readFileSync(join(PROJECT_PATH, 'out_publish', '_redirects')).toString()

    // Replace non-persistent build ID with placeholder
    contents = contents.replace(/\/_next\/data\/[^\/]+\//g, '/_next/data/%BUILD_ID%/')

    const redirects = contents.trim().split(/\n/)

    expect(redirects[0]).toEqual('# Next-on-Netlify Redirects')
    expect(redirects[1]).toEqual('/  /.netlify/functions/next_index  200')
    expect(redirects[2]).toEqual('/_next/data/%BUILD_ID%/index.json  /.netlify/functions/next_index  200')

    // Check that no other redirects are present
    // TO-DO: add back in when /*  /:splat workaround is removed
    // expect(redirects).toHaveLength(3);
  })
})
