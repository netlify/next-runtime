const project = 'optionalCatchAll-at-root'

before(() => {
  // When changing the base URL within a spec file, Cypress runs the spec twice
  // To avoid rebuilding and redeployment on the second run, we check if the
  // project has already been deployed.
  cy.task('isDeployed').then((isDeployed) => {
    // Cancel setup, if already deployed
    if (isDeployed) return

    // Clear project folder
    cy.task('clearProject', { project })

    // Copy NextJS files
    cy.task('copyFixture', {
      project,
      from: 'pages-with-optionalCatchAll-at-root',
      to: 'pages',
    })
    cy.task('copyFixture', {
      project,
      from: 'next.config.js',
      to: 'next.config.js',
    })

    // Copy package.json file
    cy.task('copyFixture', {
      project,
      from: 'package.json',
      to: 'package.json',
    })

    // Copy Netlify settings
    cy.task('copyFixture', {
      project,
      from: 'netlify.toml',
      to: 'netlify.toml',
    })
    cy.task('copyFixture', {
      project,
      from: '.netlify',
      to: '.netlify',
    })

    // Public
    cy.task('copyFixture', {
      project,
      from: 'public',
      to: 'public',
    })

    // Build
    cy.task('buildProject', { project })

    // Deploy
    cy.task('deployProject', { project }, { timeout: 180 * 1000 })
  })

  // Set base URL
  cy.task('getBaseUrl', { project }).then((url) => {
    Cypress.config('baseUrl', url)
  })
})

after(() => {
  // While the before hook runs twice (it's re-run when the base URL changes),
  // the after hook only runs once.
  cy.task('clearDeployment')
})

describe('optional-catch-all page at root level', () => {
  it('renders on /', () => {
    cy.visit('/')
    cy.get('p').should('contain', 'root-level optional-catch-all')
  })

  it('renders on /undefined-path', () => {
    cy.visit('/undefined-path')
    cy.get('p').should('contain', 'root-level optional-catch-all')
  })

  it('renders on /subfolder/page/test', () => {
    cy.visit('/subfolder/page/test')
    cy.get('p').should('contain', 'root-level optional-catch-all')
  })
})

describe('pre-rendered page: /static.js', () => {
  it('serves /static', () => {
    cy.visit('/static')
    cy.get('p').should('contain', 'static page')
  })
})

describe("SSR'd page: /[bar]/ssr.js", () => {
  it('loads TV show', () => {
    cy.visit('/1337/ssr')

    cy.get('h1').should('contain', 'Show #1337')
    cy.get('p').should('contain', 'Whodunnit?')
  })

  it('loads TV show when SSR-ing', () => {
    cy.ssr('/1337/ssr')

    cy.get('h1').should('contain', 'Show #1337')
    cy.get('p').should('contain', 'Whodunnit?')
  })

  it('loads page props from data .json file when navigating to it', () => {
    cy.visit('/home')
    cy.window().then((w) => (w.noReload = true))

    // Navigate to page and test that no reload is performed
    // See: https://glebbahmutov.com/blog/detect-page-reload/
    cy.contains('1337/ssr').click()

    cy.get('h1').should('contain', 'Show #1337')
    cy.get('p').should('contain', 'Whodunnit?')

    cy.contains('Go back home').click()
    cy.contains('1338/ssr').click()

    cy.get('h1').should('contain', 'Show #1338')
    cy.get('p').should('contain', 'The Whole Truth')

    cy.window().should('have.property', 'noReload', true)
  })
})

describe('pre-rendered pages: /subfolder/[id].js', () => {
  it('serves /subfolder/static', () => {
    cy.visit('/subfolder/static')
    cy.get('p').should('contain', 'static page in subfolder')
  })

  it('serves /subfolder/test', () => {
    cy.visit('/subfolder/test')
    cy.get('p').should('contain', 'static page in subfolder')
  })

  it('serves the pre-rendered HTML (and not the Netlify Function)', () => {
    if (Cypress.env('DEPLOY') !== 'local') {
      cy.request('/subfolder/static').then((response) => {
        expect(response.headers['cache-control']).to.include('public')
      })
    }
  })
})

describe('fallback page: /subfolder/[id].js', () => {
  it('renders on /subfolder/undefined-path', () => {
    cy.visit('/subfolder/undefined-path')
    cy.get('p').should('contain', 'static page in subfolder')
  })

  it('server-side-renders the HTML via a Netlify Function', () => {
    cy.request('/subfolder/undefined-path').then((response) => {
      expect(response.headers['cache-control']).not.to.include('public')
    })
  })
})

describe('public assets', () => {
  it('serves /file.txt', () => {
    cy.request('/file.txt').then((response) => {
      expect(response.body).to.include('a text file')
    })
  })

  it('serves /subfolder/file.txt', () => {
    cy.request('/subfolder/file.txt').then((response) => {
      expect(response.body).to.include('a text file in a subfolder')
    })
  })

  it('serves /folder/file.txt', () => {
    cy.request('/folder/file.txt').then((response) => {
      expect(response.body).to.include('a text file in a folder')
    })
  })
})
