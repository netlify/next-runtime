const project = 'i18n'

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
      from: 'pages-with-i18n',
      to: 'pages',
    })
    cy.task('copyFixture', {
      project,
      from: 'next.config.js-with-i18n',
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
    cy.task('deployProject', { project }, { timeout: 480 * 1000 })
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

describe('getInitialProps', () => {
  context('with static route', () => {
    it('loads TV shows', () => {
      cy.visit('/')

      cy.get('ul').first().children().should('have.length', 5)
    })

    it('loads TV shows when SSR-ing', () => {
      cy.ssr('/')

      cy.get('ul').first().children().should('have.length', 5)
    })
  })

  context('with dynamic route', () => {
    it('loads TV show', () => {
      cy.visit('/shows/24251')

      cy.get('h1').should('contain', 'Show #24251')
      cy.get('p').should('contain', 'Animal Science')
    })

    it('loads TV show when SSR-ing', () => {
      cy.ssr('/shows/24251')

      cy.get('h1').should('contain', 'Show #24251')
      cy.get('p').should('contain', 'Animal Science')
    })
  })

  context('with catch-all route', () => {
    it('displays all URL parameters, including query string parameters', () => {
      cy.visit('/shows/94/this-is-all/being/captured/yay?search=dog&custom-param=cat')

      // path parameters
      cy.get('p').should('contain', '[0]: 94')
      cy.get('p').should('contain', '[1]: this-is-all')
      cy.get('p').should('contain', '[2]: being')
      cy.get('p').should('contain', '[3]: captured')
      cy.get('p').should('contain', '[4]: yay')

      // query string parameters
      cy.get('p').should('contain', '[search]: dog')
      cy.get('p').should('contain', '[custom-param]: cat')

      cy.get('h1').should('contain', 'Show #94')
      cy.get('p').should('contain', 'Defiance')
    })

    it('displays all URL parameters when SSR-ing, including query string parameters', () => {
      cy.visit('/shows/94/this-is-all/being/captured/yay?search=dog&custom-param=cat')

      // path parameters
      cy.get('p').should('contain', '[0]: 94')
      cy.get('p').should('contain', '[1]: this-is-all')
      cy.get('p').should('contain', '[2]: being')
      cy.get('p').should('contain', '[3]: captured')
      cy.get('p').should('contain', '[4]: yay')

      // query string parameters
      cy.get('p').should('contain', '[search]: dog')
      cy.get('p').should('contain', '[custom-param]: cat')

      cy.get('h1').should('contain', 'Show #94')
      cy.get('p').should('contain', 'Defiance')
    })
  })
})

describe('getServerSideProps', () => {
  context('with static route', () => {
    it('loads TV shows', () => {
      cy.visit('/getServerSideProps/static')

      cy.get('h1').should('contain', 'Show #42')
      cy.get('p').should('contain', 'Sleepy Hollow')
    })

    it('loads TV shows when SSR-ing', () => {
      cy.ssr('/getServerSideProps/static')

      cy.get('h1').should('contain', 'Show #42')
      cy.get('p').should('contain', 'Sleepy Hollow')
    })

    it('loads page props from data .json file when navigating to it', () => {
      cy.visit('/')
      cy.window().then((w) => (w.noReload = true))

      // Navigate to page and test that no reload is performed
      // See: https://glebbahmutov.com/blog/detect-page-reload/
      cy.contains('getServerSideProps/static').click()
      cy.get('h1').should('contain', 'Show #42')
      cy.get('p').should('contain', 'Sleepy Hollow')
      cy.window().should('have.property', 'noReload', true)
    })
  })

  context('with dynamic route', () => {
    it('loads TV show', () => {
      cy.visit('/getServerSideProps/1337')

      cy.get('h1').should('contain', 'Show #1337')
      cy.get('p').should('contain', 'Whodunnit?')
    })

    it('loads TV show when SSR-ing', () => {
      cy.ssr('/getServerSideProps/1337')

      cy.get('h1').should('contain', 'Show #1337')
      cy.get('p').should('contain', 'Whodunnit?')
    })

    it('loads page props from data .json file when navigating to it', () => {
      cy.visit('/')
      cy.window().then((w) => (w.noReload = true))

      // Navigate to page and test that no reload is performed
      // See: https://glebbahmutov.com/blog/detect-page-reload/
      cy.contains('getServerSideProps/1337').click()

      cy.get('h1').should('contain', 'Show #1337')
      cy.get('p').should('contain', 'Whodunnit?')

      cy.contains('Go back home').click()
      cy.contains('getServerSideProps/1338').click()

      cy.get('h1').should('contain', 'Show #1338')
      cy.get('p').should('contain', 'The Whole Truth')

      cy.window().should('have.property', 'noReload', true)
    })
  })

  context('with catch-all route', () => {
    it('does not match base path (without params)', () => {
      cy.request({
        url: '/getServerSideProps/catch/all',
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(404)
        cy.state('document').write(response.body)
      })

      cy.get('h2').should('contain', 'This page could not be found.')
    })

    it('loads TV show with one param', () => {
      cy.visit('/getServerSideProps/catch/all/1337')

      cy.get('h1').should('contain', 'Show #1337')
      cy.get('p').should('contain', 'Whodunnit?')
    })

    it('loads TV show with multiple params', () => {
      cy.visit('/getServerSideProps/catch/all/1337/multiple/params')

      cy.get('h1').should('contain', 'Show #1337')
      cy.get('p').should('contain', 'Whodunnit?')
    })

    it('loads page props from data .json file when navigating to it', () => {
      cy.visit('/')
      cy.window().then((w) => (w.noReload = true))

      // Navigate to page and test that no reload is performed
      // See: https://glebbahmutov.com/blog/detect-page-reload/
      cy.contains('getServerSideProps/catch/all/1337').click()

      cy.get('h1').should('contain', 'Show #1337')
      cy.get('p').should('contain', 'Whodunnit?')

      cy.contains('Go back home').click()
      cy.contains('getServerSideProps/catch/all/1338').click()

      cy.get('h1').should('contain', 'Show #1338')
      cy.get('p').should('contain', 'The Whole Truth')

      cy.window().should('have.property', 'noReload', true)
    })
  })
})

describe('getStaticProps', () => {
  context('with static route', () => {
    it('loads TV show', () => {
      cy.visit('/getStaticProps/static')

      cy.get('h1').should('contain', 'Show #71')
      cy.get('p').should('contain', 'Dancing with the Stars')
    })

    it('loads page props from data .json file when navigating to it', () => {
      cy.visit('/')
      cy.window().then((w) => (w.noReload = true))

      // Navigate to page and test that no reload is performed
      // See: https://glebbahmutov.com/blog/detect-page-reload/
      cy.contains('getStaticProps/static').click()
      cy.get('h1').should('contain', 'Show #71')
      cy.get('p').should('contain', 'Dancing with the Stars')
      cy.window().should('have.property', 'noReload', true)
    })

    context('with revalidate', () => {
      it('loads TV show', () => {
        cy.visit('/getStaticProps/with-revalidate')

        cy.get('h1').should('contain', 'Show #71')
        cy.get('p').should('contain', 'Dancing with the Stars')
      })

      it('loads TV shows when SSR-ing', () => {
        cy.ssr('/getStaticProps/with-revalidate')

        cy.get('h1').should('contain', 'Show #71')
        cy.get('p').should('contain', 'Dancing with the Stars')
      })
    })
  })

  context('with dynamic route', () => {
    context('without fallback', () => {
      it('loads shows 1 and 2', () => {
        cy.visit('/getStaticProps/1')
        cy.get('h1').should('contain', 'Show #1')
        cy.get('p').should('contain', 'Under the Dome')

        cy.visit('/getStaticProps/2')
        cy.get('h1').should('contain', 'Show #2')
        cy.get('p').should('contain', 'Person of Interest')
      })

      it('loads page props from data .json file when navigating to it', () => {
        cy.visit('/')
        cy.window().then((w) => (w.noReload = true))

        // Navigate to page and test that no reload is performed
        // See: https://glebbahmutov.com/blog/detect-page-reload/
        cy.contains('getStaticProps/1').click()

        cy.get('h1').should('contain', 'Show #1')
        cy.get('p').should('contain', 'Under the Dome')

        cy.contains('Go back home').click()
        cy.contains('getStaticProps/2').click()

        cy.get('h1').should('contain', 'Show #2')
        cy.get('p').should('contain', 'Person of Interest')

        cy.window().should('have.property', 'noReload', true)
      })

      it('returns 404 when trying to access non-defined path', () => {
        cy.request({
          url: '/getStaticProps/3',
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.eq(404)
          cy.state('document').write(response.body)
        })

        cy.get('h2').should('contain', 'This page could not be found.')
      })
    })

    context('with fallback', () => {
      it('loads pre-rendered TV shows 3 and 4', () => {
        cy.visit('/getStaticProps/withFallback/3')
        cy.get('h1').should('contain', 'Show #3')
        cy.get('p').should('contain', 'Bitten')

        cy.visit('/getStaticProps/withFallback/4')
        cy.get('h1').should('contain', 'Show #4')
        cy.get('p').should('contain', 'Arrow')
      })

      it('loads non-pre-rendered TV show', () => {
        cy.visit('/getStaticProps/withFallback/75')

        cy.get('h1').should('contain', 'Show #75')
        cy.get('p').should('contain', 'The Mindy Project')
      })

      it('loads non-pre-rendered TV shows when SSR-ing', () => {
        cy.ssr('/getStaticProps/withFallback/75')

        cy.get('h1').should('contain', 'Show #75')
        cy.get('p').should('contain', 'The Mindy Project')
      })

      it('loads page props from data .json file when navigating to it', () => {
        cy.visit('/')
        cy.window().then((w) => (w.noReload = true))

        // Navigate to page and test that no reload is performed
        // See: https://glebbahmutov.com/blog/detect-page-reload/
        cy.contains('getStaticProps/withFallback/3').click()

        cy.get('h1').should('contain', 'Show #3')
        cy.get('p').should('contain', 'Bitten')

        cy.contains('Go back home').click()
        cy.contains('getStaticProps/withFallback/4').click()

        cy.get('h1').should('contain', 'Show #4')
        cy.get('p').should('contain', 'Arrow')

        cy.contains('Go back home').click()
        cy.contains('getStaticProps/withFallback/75').click()

        cy.get('h1').should('contain', 'Show #75')
        cy.get('p').should('contain', 'The Mindy Project')

        cy.window().should('have.property', 'noReload', true)
      })
    })

    context('with revalidate', () => {
      it('loads TV show', () => {
        cy.visit('/getStaticProps/withRevalidate/75')

        cy.get('h1').should('contain', 'Show #75')
        cy.get('p').should('contain', 'The Mindy Project')
      })

      it('loads TV shows when SSR-ing', () => {
        cy.ssr('/getStaticProps/withRevalidate/75')

        cy.get('h1').should('contain', 'Show #75')
        cy.get('p').should('contain', 'The Mindy Project')
      })

      it('loads page props from data .json file when navigating to it', () => {
        cy.visit('/')
        cy.window().then((w) => (w.noReload = true))

        // Navigate to page and test that no reload is performed
        // See: https://glebbahmutov.com/blog/detect-page-reload/
        cy.contains('getStaticProps/withRevalidate/3').click()

        cy.get('h1').should('contain', 'Show #3')
        cy.get('p').should('contain', 'Bitten')

        cy.contains('Go back home').click()
        cy.contains('getStaticProps/withRevalidate/4').click()

        cy.get('h1').should('contain', 'Show #4')
        cy.get('p').should('contain', 'Arrow')

        cy.window().should('have.property', 'noReload', true)
      })
    })
  })

  context('with catch-all route', () => {
    context('with fallback', () => {
      it('loads pre-rendered shows 1 and 2', () => {
        cy.visit('/getStaticProps/withFallback/my/path/1')
        cy.get('h1').should('contain', 'Show #1')
        cy.get('p').should('contain', 'Under the Dome')

        cy.visit('/getStaticProps/withFallback/my/path/2')
        cy.get('h1').should('contain', 'Show #2')
        cy.get('p').should('contain', 'Person of Interest')
      })

      it('loads non-pre-rendered TV show', () => {
        cy.visit('/getStaticProps/withFallback/undefined/catch/all/path/75')

        cy.get('h1').should('contain', 'Show #75')
        cy.get('p').should('contain', 'The Mindy Project')
      })

      it('loads page props from data .json file when navigating to it', () => {
        cy.visit('/')
        cy.window().then((w) => (w.noReload = true))

        // Navigate to page and test that no reload is performed
        // See: https://glebbahmutov.com/blog/detect-page-reload/
        cy.contains('getStaticProps/withFallback/my/path/1').click()

        cy.get('h1').should('contain', 'Show #1')
        cy.get('p').should('contain', 'Under the Dome')

        cy.contains('Go back home').click()
        cy.contains('getStaticProps/withFallback/my/path/2').click()

        cy.get('h1').should('contain', 'Show #2')
        cy.get('p').should('contain', 'Person of Interest')

        cy.contains('Go back home').click()
        cy.contains('getStaticProps/withFallback/my/undefined/path/75').click()

        cy.get('h1').should('contain', 'Show #75')
        cy.get('p').should('contain', 'The Mindy Project')

        cy.window().should('have.property', 'noReload', true)
      })
    })
  })
})

describe('API endpoint', () => {
  context('with static route', () => {
    it('returns hello world, with all response headers', () => {
      cy.request('/api/static').then((response) => {
        expect(response.headers['content-type']).to.include('application/json')
        expect(response.headers['my-custom-header']).to.include('header123')

        expect(response.body).to.have.property('message', 'hello world :)')
      })
    })
  })

  context('with dynamic route', () => {
    it('returns TV show', () => {
      cy.request('/api/shows/305').then((response) => {
        expect(response.headers['content-type']).to.include('application/json')

        expect(response.body).to.have.property('show')
        expect(response.body.show).to.have.property('id', 305)
        expect(response.body.show).to.have.property('name', 'Black Mirror')
      })
    })
  })

  context('with catch-all route', () => {
    it('returns all URL paremeters, including query string parameters', () => {
      cy.request('/api/shows/590/this/path/is/captured?metric=dog&p2=cat').then((response) => {
        expect(response.headers['content-type']).to.include('application/json')

        // Params
        expect(response.body).to.have.property('params')
        expect(response.body.params).to.deep.eq(['590', 'this', 'path', 'is', 'captured'])

        // Query string parameters
        expect(response.body).to.have.property('queryStringParams')
        expect(response.body.queryStringParams).to.deep.eq({
          metric: 'dog',
          p2: 'cat',
        })

        // Show
        expect(response.body).to.have.property('show')
        expect(response.body.show).to.have.property('id', 590)
        expect(response.body.show).to.have.property('name', 'Pokémon')
      })
    })
  })

  it('redirects with res.redirect', () => {
    cy.visit('/api/redirect?to=999')

    cy.url().should('include', '/shows/999')
    cy.get('h1').should('contain', 'Show #999')
    cy.get('p').should('contain', 'Flash Gordon')
  })
})

describe('Preview Mode', () => {
  it('redirects to preview test page with dynamic route', () => {
    cy.visit('/api/enterPreview?id=999')

    cy.url().should('include', '/previewTest/999')
  })

  it('redirects to static preview test page', () => {
    cy.visit('/api/enterPreviewStatic')

    cy.url().should('include', '/previewTest/static')
  })

  it('sets cookies on client', () => {
    Cypress.Cookies.debug(true)
    cy.getCookie('__prerender_bypass').should('not.exist')
    cy.getCookie('__next_preview_data').should('not.exist')

    cy.visit('/api/enterPreview?id=999')

    cy.getCookie('__prerender_bypass').should('not.be', null)
    cy.getCookie('__next_preview_data').should('not.be', null)
  })

  it('sets cookies on client with static redirect', () => {
    Cypress.Cookies.debug(true)
    cy.getCookie('__prerender_bypass').should('not.exist')
    cy.getCookie('__next_preview_data').should('not.exist')

    cy.visit('/api/enterPreviewStatic')

    cy.getCookie('__prerender_bypass').should('not.be', null)
    cy.getCookie('__next_preview_data').should('not.be', null)
  })

  it('renders serverSideProps page in preview mode', () => {
    cy.visit('/api/enterPreview?id=999')

    if (Cypress.env('DEPLOY') === 'local') {
      cy.makeCookiesWorkWithHttpAndReload()
    }

    cy.get('h1').should('contain', 'Person #999')
    cy.get('p').should('contain', 'Sebastian Lacause')
  })

  it('renders staticProps page in preview mode', () => {
    // cypress local (aka netlify dev) doesn't support cookie-based redirects
    if (Cypress.env('DEPLOY') !== 'local') {
      cy.visit('/api/enterPreviewStatic')
      cy.get('h1').should('contain', 'Number: 3')
    }
  })

  it('can move in and out of preview mode for SSRed page', () => {
    cy.visit('/api/enterPreview?id=999')

    if (Cypress.env('DEPLOY') === 'local') {
      cy.makeCookiesWorkWithHttpAndReload()
    }

    cy.get('h1').should('contain', 'Person #999')
    cy.get('p').should('contain', 'Sebastian Lacause')

    cy.contains('Go back home').click()

    // Verify that we're still in preview mode
    cy.contains('previewTest/222').click()
    cy.get('h1').should('contain', 'Person #222')
    cy.get('p').should('contain', 'Corey Lof')

    // Exit preview mode
    cy.visit('/api/exitPreview')

    // Verify that we're no longer in preview mode
    cy.contains('previewTest/222').click()
    cy.get('h1').should('contain', 'Show #222')
    cy.get('p').should('contain', 'Happyland')
  })

  it('can move in and out of preview mode for static page', () => {
    if (Cypress.env('DEPLOY') !== 'local') {
      cy.visit('/api/enterPreviewStatic')
      cy.window().then((w) => (w.noReload = true))

      cy.get('h1').should('contain', 'Number: 3')

      cy.contains('Go back home').click()

      // Verify that we're still in preview mode
      cy.contains('previewTest/static').click()
      cy.get('h1').should('contain', 'Number: 3')

      cy.window().should('have.property', 'noReload', true)

      // Exit preview mode
      cy.visit('/api/exitPreview')

      // TO-DO: test if this is the static html?
      // Verify that we're no longer in preview mode
      cy.contains('previewTest/static').click()
      cy.get('h1').should('contain', 'Number: 4')
    }
  })

  it('hits the prerendered html out of preview mode and netlify function in preview mode', () => {
    if (Cypress.env('DEPLOY') !== 'local') {
      cy.request('/previewTest/static').then((response) => {
        expect(response.headers['cache-control']).to.include('public')
      })

      cy.visit('/api/enterPreviewStatic')

      cy.request('/previewTest/static').then((response) => {
        expect(response.headers['cache-control']).to.include('private')
      })
    }
  })
})

describe('pre-rendered HTML pages', () => {
  context('with static route', () => {
    it('renders', () => {
      cy.visit('/static')

      cy.get('p').should('contain', 'It is a static page.')
    })

    it('renders when SSR-ing', () => {
      cy.visit('/static')

      cy.get('p').should('contain', 'It is a static page.')
    })
  })

  context('with dynamic route', () => {
    it('renders', () => {
      cy.visit('/static/superdynamic')

      cy.get('p').should('contain', 'It is a static page.')
      cy.get('p').should('contain', 'it has a dynamic URL parameter: /static/:id.')
    })

    it('renders when SSR-ing', () => {
      cy.visit('/static/superdynamic')

      cy.get('p').should('contain', 'It is a static page.')
      cy.get('p').should('contain', 'it has a dynamic URL parameter: /static/:id.')
    })
  })
})

describe('404 page', () => {
  it('renders', () => {
    cy.request({
      url: '/this-page-does-not-exist',
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(404)
      cy.state('document').write(response.body)
    })

    cy.get('h2').should('contain', 'This page could not be found.')
  })
})

describe('i18n-specific behavior', () => {
  context('static pages', () => {
    it('renders dynamic route for non-default locale', () => {
      cy.visit('/fr/static/superdynamic')

      cy.get('p').should('contain', 'It is a static page.')
      cy.get('p').should('contain', 'it has a dynamic URL parameter: /static/:id.')
    })

    it('renders static page for non-default locale', () => {
      cy.visit('/fr/getStaticProps/static')

      cy.get('h1').should('contain', 'Show #71')
    })

    it('renders static page for default locale with path included in getStaticPaths', () => {
      cy.visit('/en/getStaticProps/1')

      cy.get('h1').should('contain', 'Show #1')
    })

    it('does not render non-default locale route not included in getStaticPaths', () => {
      cy.request({
        url: '/fr/getStaticProps/34',
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(404)
        cy.state('document').write(response.body)
      })

      cy.get('h2').should('contain', 'This page could not be found.')
    })

    it('renders a not-included path for fallback routes with default locale', () => {
      cy.visit('/getStaticProps/withFallback/5')

      cy.get('h1').should('contain', 'Show #5')
    })

    it('renders an included path for fallback routes with non-default locale defined', () => {
      cy.visit('/fr/getStaticProps/withFallback/4')

      cy.get('h1').should('contain', 'Show #4')
    })

    it('renders non-included path for fallback routes with non-default locale', () => {
      cy.visit('/fr/getStaticProps/withFallback/71')

      cy.get('h1').should('contain', 'Show #71')
    })

    it('renders non-default locale path for revalidate page', () => {
      cy.visit('/fr/getStaticProps/with-revalidate')

      cy.get('h1').should('contain', 'Show #71')
    })

    it('renders default locale page for reval', () => {
      cy.visit('/en/getStaticProps/withRevalidate/3')
      cy.get('h1').should('contain', 'Show #3')

      cy.visit('/getStaticProps/withRevalidate/3')
      cy.get('h1').should('contain', 'Show #3')
    })

    it('loads pre-rendered show 3 for catch-all non-default locale', () => {
      // defined in getStaticPaths
      cy.visit('/fr/getStaticProps/withFallback/my/path/3')
      cy.get('h1').should('contain', 'Show #3')
    })
  })

  context("SSR'd pages", () => {
    it('renders non-default locale for non-dynamic route', () => {
      cy.visit('/fr/getServerSideProps/static')

      cy.get('h1').should('contain', 'Show #42')
    })

    it('renders non-default locale for dynamic route', () => {
      cy.visit('/fr/getServerSideProps/5')

      cy.get('h1').should('contain', 'Show #5')
    })

    it('renders non-default locale for catch-all', () => {
      cy.visit('/fr/getServerSideProps/catch/all/5')

      cy.get('h1').should('contain', 'Show #5')
    })
  })

  context('getInitialProps pages', () => {
    it('renders naked route', () => {
      cy.visit('/shows/42')

      cy.get('h1').should('contain', 'Show #42')
    })

    it('renders non-default locale', () => {
      cy.visit('/fr/shows/42')

      cy.get('h1').should('contain', 'Show #42')
    })
  })

  context('withoutProps pages', () => {
    it('renders default locale', () => {
      cy.visit('/en/static')
      cy.get('p').should('contain', 'It is a static page.')
    })

    it('renders non-default locale', () => {
      cy.visit('/fr/static')
      cy.get('p').should('contain', 'It is a static page.')
    })
  })
})
