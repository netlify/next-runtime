describe('Rewrites and Redirects', () => {
  // TODO: detect if rewrite is app or page route for __NEXT_PRIVATE_PREBUNDLED_REACT logic
  it.skip('rewrites: points /old to /', () => {
    // preview mode is off by default
    cy.visit('/old')
    cy.findByText('NextJS on Netlify (imported Header component)')
    cy.url().should('eq', `${Cypress.config().baseUrl}/old/`)

    // ensure headers are still set
    cy.request('/api/enterPreview').then(
  (response) => {
    expect(response.body).to.have.property('name', 'preview mode')
  }
)
  })

  it('redirects: redirects /redirectme to /', () => {
    cy.visit('/redirectme')
    cy.url().should('eq', `${Cypress.config().baseUrl}/`)
  }
  )
})