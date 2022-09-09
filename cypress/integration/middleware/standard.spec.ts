describe('Standard middleware', () => {
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

  it('adds headers to static pages', () => {
    cy.request('/shows/static/3').then((response) => {
      expect(response.headers).to.have.property('x-middleware-date')
      expect(response.headers).to.have.property('x-is-deno', 'true')
      expect(response.headers).to.have.property('x-modified-edge', 'true')
    })
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
    cy.request('/_next/data/build-id/static.json').then((response) => {
      expect(response.headers).to.have.property('x-is-deno', 'true')
      expect(response.headers).to.have.property('x-modified-edge', 'true')
    })
  })
})
