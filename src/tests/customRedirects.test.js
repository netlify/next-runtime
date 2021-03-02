// Test next-on-netlify when a custom distDir is set in next.config.js

const { EOL } = require('os')
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
      .withPages('pages-with-static-props-index')
      .withNextConfig('next.config.js')
      .withPackageJson('package.json')
      .withFile('_redirects')
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
  test('includes custom redirect rules', async () => {
    // Read _redirects file
    const contents = readFileSync(join(PROJECT_PATH, 'out_publish', '_redirects'), 'utf8')

    const redirects = contents.trim().split(EOL)
    expect(redirects[0]).toEqual('# Custom Redirect Rules')
    expect(redirects[1]).toEqual('https://old.example.com/* https://new.example.com/:splat 301!')
  })
})
