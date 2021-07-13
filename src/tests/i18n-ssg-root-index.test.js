// Test next-on-netlify when i18n is set in next.config.js (Next 10+)

const { parse, join } = require('path')
const buildNextApp = require('./helpers/buildNextApp')

// The name of this test file (without extension)
const FILENAME = parse(__filename).name

// The directory which will be used for testing.
// We simulate a NextJS app within that directory, with pages, and a
// package.json file.
const PROJECT_PATH = join(__dirname, 'builds', FILENAME)

const DEFAULT_LOCALE = 'en'

// Capture the output to verify successful build
let buildOutput

beforeAll(
  async () => {
    buildOutput = await buildNextApp()
      .forTest(__filename)
      .withPages('pages-i18n-ssg-index')
      .withNextConfig('next.config.js-with-i18n.js')
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

describe('next-on-netlify', () => {
  test('builds successfully', () => {
    expect(buildOutput).toMatch('Next on Netlify')
    expect(buildOutput).toMatch(`Copying static NextJS assets to out_publish`)
    expect(buildOutput).toMatch(`Setting up API endpoints as Netlify Functions in out_functions`)
    expect(buildOutput).toMatch(`Setting up pages with getInitialProps as Netlify Functions in out_functions`)
    expect(buildOutput).toMatch(`Setting up pages with getServerSideProps as Netlify Functions in out_functions`)
    expect(buildOutput).toMatch(`Copying pre-rendered pages with getStaticProps and JSON data to out_publish`)
    expect(buildOutput).toMatch(
      `Setting up pages with getStaticProps and fallback: true as Netlify Functions in out_functions`,
    )
    expect(buildOutput).toMatch(
      `Setting up pages with getStaticProps and revalidation interval as Netlify Functions in out_functions`,
    )
    expect(buildOutput).toMatch(`Copying pre-rendered pages without props to out_publish`)
    expect(buildOutput).toMatch('Setting up redirects')
    expect(buildOutput).toMatch('Success! All done!')
  })
})
