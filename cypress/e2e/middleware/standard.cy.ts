describe('Standard middleware', () => {
  it('adds request headers', () => {
    cy.request('/api/hello').then((response) => {
      expect(response.body).to.have.nested.property('headers.x-hello', 'world')
    })
  })

  it('adds request headers to a rewrite', () => {
    cy.request('/headers').then((response) => {
      expect(response.body).to.have.nested.property('headers.x-hello', 'world')
    })
  })

  it('rewrites to internal page', () => {
    // preview mode is off by default
    cy.visit('/shows/rewriteme')
    cy.get('h1').should('contain', 'Show #100')
    cy.url().should('eq', `${Cypress.config().baseUrl}/shows/rewriteme`)
  })

  it('rewrites to external page', () => {
    cy.visit('/shows/rewrite-external')
    cy.get('h1').should('contain', 'Example Domain')
    cy.url().should('eq', `${Cypress.config().baseUrl}/shows/rewrite-external`)
  })

  it('doesnt follow redirects from rewritten page', () => {
    cy.request({ url: '/rewrite-to-redirect', followRedirect: false }).then((response) => {
      expect(response.status).to.eq(302)
      expect(response.redirectedToUrl).to.eq('https://example.com/')
    })
  })

  it('adds headers to static pages', () => {
    cy.request('/shows/static/3').then((response) => {
      expect(response.headers).to.have.property('x-middleware-date')
      expect(response.headers).to.have.property('x-is-deno', 'true')
      expect(response.headers).to.have.property('x-modified-edge', 'true')
    })
  })

  it('adds cookies', () => {
    cy.request('/cookies').then(() => {
      cy.getCookie('netlifyCookie').should('have.property', 'value', 'true')
    })
  })

  // https://github.com/netlify/pillar-support/issues/350
  it('MiddlewareResponse adds cookies', () => {
    cy.request('/cookies/middleware').then((response) => {
      cy.getCookie('middlewareCookie').should('have.property', 'value', 'true')
      expect(response.headers).to.have.property('x-foo', 'bar')
    })
  })

  it('preserves locale on rewrites (skipMiddlewareUrlNormalize: true)', () => {
    cy.visit('/de-de/locale-preserving-rewrite')
    cy.get('div').should('contain', 'Locale: de-DE')
    cy.url().should('eq', `${Cypress.config().baseUrl}/de-de/locale-preserving-rewrite`)
  })
})

describe('Middleware matchers', () => {
  it('does not apply "has" matcher when headers are not sent', () => {
    cy.request('/conditional').then((response) => {
      expect(response.headers).not.to.have.property('x-is-deno', 'true')
      expect(response.headers).not.to.have.property('x-modified-edge', 'true')
    })
  })

  it('matches when headers are sent', () => {
    cy.request({ url: '/conditional', headers: { 'x-my-header': 'my-value' } }).then((response) => {
      expect(response.headers).to.have.property('x-is-deno', 'true')
      expect(response.headers).to.have.property('x-modified-edge', 'true')
    })
  })

  it('matches when headers are sent', () => {
    cy.request('/_next/data/build-id/en/static.json').then((response) => {
      expect(response.headers).to.have.property('x-is-deno', 'true')
      expect(response.headers).to.have.property('x-modified-edge', 'true')
    })
  })

  it('correctly handles negative lookaheads', () => {
    cy.request('/shows/11').then((response) => {
      expect(response.headers).to.have.property('x-is-deno', 'true')
      expect(response.headers).to.have.property('x-modified-edge', 'true')
    })
    cy.request('/shows/99').then((response) => {
      expect(response.headers).not.to.have.property('x-is-deno', 'true')
      expect(response.headers).not.to.have.property('x-modified-edge', 'true')
    })
  })
})

describe('Middleware with edge API', () => {
  it('serves API routes from the edge runtime', () => {
    cy.request('/api/edge').then((response) => {
      expect(response.body).to.include('Hello world')
    })
  })
})
