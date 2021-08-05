// Test default next-on-netlify configuration

const { parse, join } = require('path')
const { existsSync, readdirSync, readFileSync, readJsonSync } = require('fs-extra')
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
      .withPages('pages')
      .withNextConfig('next.config.js')
      .withPackageJson('package.json')
      .withFile('image.png', join('public', 'image.png'))
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
    expect(buildOutput).toMatch(`Copying public folder to out_publish`)
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
    expect(existsSync(join(functionsDir, 'next_index', 'next_index.js'))).toBe(true)
    expect(existsSync(join(functionsDir, 'next_shows_id', 'next_shows_id.js'))).toBe(true)
    expect(existsSync(join(functionsDir, 'next_shows_params', 'next_shows_params.js'))).toBe(true)
    expect(existsSync(join(functionsDir, 'next_getServerSideProps_static', 'next_getServerSideProps_static.js'))).toBe(
      true,
    )
    expect(
      readFileSync(join(functionsDir, 'next_getServerSideProps_id', 'next_getServerSideProps_id.js'), 'utf-8'),
    ).toMatch(`require("./nextPage/pages/getServerSideProps/[id].js")`)
  })
})

describe('API Pages', () => {
  const functionsDir = join(PROJECT_PATH, 'out_functions')

  test('creates a Netlify Function for each API endpoint', () => {
    expect(existsSync(join(functionsDir, 'next_api_static', 'next_api_static.js'))).toBe(true)
    expect(existsSync(join(functionsDir, 'next_api_shows_id', 'next_api_shows_id.js'))).toBe(true)
    expect(existsSync(join(functionsDir, 'next_api_shows_params', 'next_api_shows_params.js'))).toBe(true)
    expect(existsSync(join(functionsDir, 'next_api_hello-background', 'next_api_hello-background.js'))).toBe(true)
  })
})

describe('next/image', () => {
  const functionsDir = join(PROJECT_PATH, 'out_functions')

  test('sets up next_image as a function in every project by default', () => {
    expect(existsSync(join(functionsDir, 'next_image', 'next_image.js'))).toBe(true)
  })

  test('injects the image plugin config into the function', () => {
    expect(readJsonSync(join(functionsDir, 'next_image', 'imageconfig.json')).domains).toEqual(["placekitten.com"])
  })

})

describe('SSG Pages with getStaticProps', () => {
  test('creates pre-rendered HTML file in output directory', () => {
    const OUTPUT_PATH = join(PROJECT_PATH, 'out_publish')

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
    const dataDir = join(PROJECT_PATH, 'out_publish', '_next', 'data', dirs[0])

    expect(existsSync(join(dataDir, 'getStaticProps', 'static.json'))).toBe(true)
    expect(existsSync(join(dataDir, 'getStaticProps', '1.json'))).toBe(true)
    expect(existsSync(join(dataDir, 'getStaticProps', '2.json'))).toBe(true)
    expect(existsSync(join(dataDir, 'getStaticProps', 'withFallback', '3.json'))).toBe(true)
    expect(existsSync(join(dataDir, 'getStaticProps', 'withFallback', '4.json'))).toBe(true)
    expect(existsSync(join(dataDir, 'getStaticProps', 'withFallback', 'my', 'path', '1.json'))).toBe(true)
    expect(existsSync(join(dataDir, 'getStaticProps', 'withFallback', 'my', 'path', '2.json'))).toBe(true)
  })

  test('creates Netlify Functions for pages with fallback', () => {
    const functionPath1 = 'next_getStaticProps_withFallback_id/next_getStaticProps_withFallback_id.js'
    expect(existsSync(join(PROJECT_PATH, 'out_functions', functionPath1))).toBe(true)

    const previewFunctionPath1 = 'preview-next_getStaticProps_withFallback_id/preview-next_getStaticProps_withFallback_id.js'
    expect(existsSync(join(PROJECT_PATH, 'out_functions', previewFunctionPath1))).toBe(true)

    const functionPath2 = 'next_getStaticProps_withFallback_slug/next_getStaticProps_withFallback_slug.js'
    expect(existsSync(join(PROJECT_PATH, 'out_functions', functionPath2))).toBe(true)

    const previewFunctionPath2 = 'preview-next_getStaticProps_withFallback_slug/preview-next_getStaticProps_withFallback_slug.js'
    expect(existsSync(join(PROJECT_PATH, 'out_functions', previewFunctionPath2))).toBe(true)
  })
})

describe('SSG Pages with getStaticProps and revalidate', () => {
  const functionsDir = join(PROJECT_PATH, 'out_functions')

  test('creates a Netlify Function for each page', () => {
    expect(
      existsSync(join(functionsDir, 'next_getStaticProps_withrevalidate', 'next_getStaticProps_withrevalidate.js')),
    ).toBe(true)
    expect(
      existsSync(
        join(functionsDir, 'next_getStaticProps_withRevalidate_id', 'next_getStaticProps_withRevalidate_id.js'),
      ),
    ).toBe(true)
    expect(
      existsSync(
        join(
          functionsDir,
          'next_getStaticProps_withRevalidate_withFallback_id',
          'next_getStaticProps_withRevalidate_withFallback_id.js',
        ),
      ),
    ).toBe(true)
  })
})

describe('Static Pages', () => {
  test('copies static pages to output directory', () => {
    const OUTPUT_PATH = join(PROJECT_PATH, 'out_publish')

    expect(existsSync(join(OUTPUT_PATH, 'static.html'))).toBe(true)
    expect(existsSync(join(OUTPUT_PATH, 'static/[id].html'))).toBe(true)
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

describe('Public assets', () => {
  test('copies public files to output directory', () => {
    const OUTPUT_PATH = join(PROJECT_PATH, 'out_publish')

    expect(existsSync(join(OUTPUT_PATH, 'image.png'))).toBe(true)
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

describe('Headers', () => {
  test('creates Netlify headers', async () => {
    // Read _headers file
    const contents = readFileSync(join(PROJECT_PATH, 'out_publish', '_headers'))
    let headers = contents.toString()

    // Check that headers match
    expect(headers).toMatchSnapshot()
  })
})
