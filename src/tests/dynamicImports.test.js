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

// Capture the output to verify successful build
let buildOutput

beforeAll(
  async () => {
    buildOutput = await buildNextApp()
      .forTest(__filename)
      .withPages('pages-dynamic-imports')
      .withNextConfig('next.config.js-est')
      .withPackageJson('package.json')
      .withFile('components/Header.js', join('components', 'Header.js'))
      .build()
  },
  // time out after 180 seconds
  180 * 1000,
)

describe('next-on-netlify', () => {
  const functionsDir = join(PROJECT_PATH, 'out_functions')

  test('builds successfully', () => {
    expect(buildOutput).toMatch('Next on Netlify')
    expect(buildOutput).toMatch('Success! All done!')
  })

  test('copies chunk files to ', () => {
    const functionFiles = readdirSync(join(functionsDir, 'next_index'))
    const chunkRegex = new RegExp(/(\.?[-$~\w]+)+\.js$/g)
    let chunkFileExists
    functionFiles.forEach((file) => {
      chunkFileExists = chunkRegex.test(file)
    })
    expect(chunkFileExists).toBe(true)
  })
})
