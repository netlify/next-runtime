// Test next-on-netlify when i18n is set in next.config.js (Next 10+)

const { parse, join } = require('path')
const { existsSync, readdirSync, readFileSync, readJsonSync } = require('fs-extra')
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
      .withPages('pages')
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

describe('SSR Pages', () => {
  const functionsDir = join(PROJECT_PATH, 'out_functions')

  test('creates a Netlify Function for each SSR page', () => {
    expect(existsSync(join(functionsDir, 'next_index', 'next_index.ts'))).toBe(true)
    expect(existsSync(join(functionsDir, 'next_shows_id', 'next_shows_id.ts'))).toBe(true)
    expect(existsSync(join(functionsDir, 'next_shows_params', 'next_shows_params.ts'))).toBe(true)
    expect(existsSync(join(functionsDir, 'next_getServerSideProps_static', 'next_getServerSideProps_static.ts'))).toBe(
      true,
    )
    expect(existsSync(join(functionsDir, 'next_getServerSideProps_id', 'next_getServerSideProps_id.ts'))).toBe(true)
  })
})

describe('API Pages', () => {
  const functionsDir = join(PROJECT_PATH, 'out_functions')

  test('creates a Netlify Function for each API endpoint', () => {
    expect(existsSync(join(functionsDir, 'next_api_static', 'next_api_static.ts'))).toBe(true)
    expect(existsSync(join(functionsDir, 'next_api_shows_id', 'next_api_shows_id.ts'))).toBe(true)
    expect(existsSync(join(functionsDir, 'next_api_shows_params', 'next_api_shows_params.ts'))).toBe(true)
  })
})

describe('SSG Pages with getStaticProps', () => {
  test('creates pre-rendered HTML file in output directory', () => {
    const OUTPUT_PATH = join(PROJECT_PATH, 'out_publish', DEFAULT_LOCALE)

    expect(existsSync(join(OUTPUT_PATH, 'getStaticProps', 'static.html'))).toBe(true)
    expect(existsSync(join(OUTPUT_PATH, 'getStaticProps', '1.html'))).toBe(true)
    expect(existsSync(join(OUTPUT_PATH, 'getStaticProps', '2.html'))).toBe(true)
    expect(existsSync(join(OUTPUT_PATH, 'getStaticProps', 'withFallback', '3.html'))).toBe(true)
    expect(existsSync(join(OUTPUT_PATH, 'getStaticProps', 'withFallback', '4.html'))).toBe(true)
    expect(existsSync(join(OUTPUT_PATH, 'getStaticProps', 'withFallback', 'my', 'path', '1.html'))).toBe(true)
    expect(existsSync(join(OUTPUT_PATH, 'getStaticProps', 'withFallback', 'my', 'path', '2.html'))).toBe(true)
  })

  test('creates data .json file in /_next/data/ directory', () => {
    // Get path to data files
    const dirs = readdirSync(join(PROJECT_PATH, 'out_publish', '_next', 'data'))
    expect(dirs.length).toBe(1)
    const dataDir = join(PROJECT_PATH, 'out_publish', '_next', 'data', dirs[0], DEFAULT_LOCALE)

    expect(existsSync(join(dataDir, 'getStaticProps', 'static.json'))).toBe(true)
    expect(existsSync(join(dataDir, 'getStaticProps', '1.json'))).toBe(true)
    expect(existsSync(join(dataDir, 'getStaticProps', '2.json'))).toBe(true)
    expect(existsSync(join(dataDir, 'getStaticProps', 'withFallback', '3.json'))).toBe(true)
    expect(existsSync(join(dataDir, 'getStaticProps', 'withFallback', '4.json'))).toBe(true)
    expect(existsSync(join(dataDir, 'getStaticProps', 'withFallback', 'my', 'path', '1.json'))).toBe(true)
    expect(existsSync(join(dataDir, 'getStaticProps', 'withFallback', 'my', 'path', '2.json'))).toBe(true)
  })

  test('creates Netlify Functions for pages with fallback', () => {
    const functionPath1 = 'next_getStaticProps_withFallback_id/next_getStaticProps_withFallback_id.ts'
    expect(existsSync(join(PROJECT_PATH, 'out_functions', functionPath1))).toBe(true)

    const functionPath2 = 'next_getStaticProps_withFallback_slug/next_getStaticProps_withFallback_slug.ts'
    expect(existsSync(join(PROJECT_PATH, 'out_functions', functionPath2))).toBe(true)
  })
})

describe('SSG Pages with getStaticProps and revalidate', () => {
  const functionsDir = join(PROJECT_PATH, 'out_functions')

  test('creates a Netlify Function for each page', () => {
    expect(
      existsSync(join(functionsDir, 'next_getStaticProps_withrevalidate', 'next_getStaticProps_withrevalidate.ts')),
    ).toBe(true)
    expect(
      existsSync(
        join(functionsDir, 'next_getStaticProps_withRevalidate_id', 'next_getStaticProps_withRevalidate_id.ts'),
      ),
    ).toBe(true)
    expect(
      existsSync(
        join(
          functionsDir,
          'next_getStaticProps_withRevalidate_withFallback_id',
          'next_getStaticProps_withRevalidate_withFallback_id.ts',
        ),
      ),
    ).toBe(true)
  })
})

describe('Static Pages', () => {
  test('copies static pages to output directory', () => {
    const OUTPUT_PATH = join(PROJECT_PATH, 'out_publish', DEFAULT_LOCALE)

    expect(existsSync(join(OUTPUT_PATH, 'static.html'))).toBe(true)
    expect(existsSync(join(OUTPUT_PATH, 'static/[id].html'))).toBe(true)
  })

  test('copies static assets to out_publish/_next/ directory', () => {
    const dirs = readdirSync(join(PROJECT_PATH, 'out_publish', '_next', 'static'))

    expect(dirs.length).toBe(2)
    expect(dirs).toContain('chunks')
  })

  test.each(['en', 'es'])('multiple locales', (locale) => {
    const OUTPUT_PATH = join(PROJECT_PATH, 'out_publish', locale)

    expect(existsSync(join(OUTPUT_PATH, 'static.html'))).toBe(true)
    expect(existsSync(join(OUTPUT_PATH, 'static/[id].html'))).toBe(true)
  })

  test('locale not included in config', () => {
    const notIncludedLocale = 'fr'
    const OUTPUT_PATH = join(PROJECT_PATH, 'out_publish', notIncludedLocale)

    expect(existsSync(join(OUTPUT_PATH, 'static.html'))).toBe(false)
    expect(existsSync(join(OUTPUT_PATH, 'static/[id].html'))).toBe(false)
  })
})

describe('404 Page', () => {
  test('copies 404.html to output directory', () => {
    const OUTPUT_PATH = join(PROJECT_PATH, 'out_publish', DEFAULT_LOCALE)

    expect(existsSync(join(OUTPUT_PATH, '404.html'))).toBe(true)
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
