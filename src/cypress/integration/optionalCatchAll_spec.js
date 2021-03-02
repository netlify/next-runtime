const project = 'optionalCatchAll'

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
      from: 'pages-with-optionalCatchAll',
      to: 'pages',
    })
    cy.task('copyFixture', {
      project,
      from: 'next.config.js-with-optionalCatchAll',
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

describe('Page with optional catch all routing', () => {
  it('responds to base path', () => {
    cy.visit('/catch')

    cy.get('h1').should('contain', 'Show #1')
    cy.get('p').should('contain', 'Under the Dome')
  })

  it('responds to catch-all path', () => {
    cy.visit('/catch/25/catch/all')

    cy.get('h1').should('contain', 'Show #25')
    cy.get('p').should('contain', 'Hellsing')
  })

  it('loads page props from data .json file when navigating to it', () => {
    cy.visit('/')
    cy.window().then((w) => (w.noReload = true))

    // Navigate to page and test that no reload is performed
    // See: https://glebbahmutov.com/blog/detect-page-reload/
    cy.contains('/catch').click()
    cy.get('h1').should('contain', 'Show #1')
    cy.get('p').should('contain', 'Under the Dome')

    cy.contains('Go back home').click()
    cy.contains('/catch/25/catch/all').click()

    cy.get('h1').should('contain', 'Show #25')
    cy.get('p').should('contain', 'Hellsing')

    cy.contains('Go back home').click()
    cy.contains('/catch/75/undefined/path/test').click()

    cy.get('h1').should('contain', 'Show #75')
    cy.get('p').should('contain', 'The Mindy Project')
    cy.window().should('have.property', 'noReload', true)
  })
})
