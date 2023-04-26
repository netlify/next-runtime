describe('Rewrites and Redirects', () => {
  it('rewrites: points /old to /', () => {
    // preview mode is off by default
    cy.visit('/old/another/')
    cy.findByText('Another page')
    cy.url().should('eq', `${Cypress.config().baseUrl}/old/another/`)
  })

  it('redirects: redirects /redirectme to /', () => {
    cy.visit('/redirectme')
    cy.url().should('eq', `${Cypress.config().baseUrl}/`)
  })
})
