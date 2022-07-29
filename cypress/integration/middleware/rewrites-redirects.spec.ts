describe('Rewrites and Redirects', () => {
  it('rewrites to internal page', () => {
    // preview mode is off by default
    cy.visit('/shows/rewriteme')
    cy.get('h1').should('contain', 'Shows #100')
    cy.findByText('NextJS on Netlify (imported Header component)')
    cy.url().should('eq', `${Cypress.config().baseUrl}/shows/rewriteme`)
  })

  it('rewrites to external page', () => {
    cy.visit('/shows/rewrite-external')
    cy.get('h1').should('contain', 'Example Domain')
    cy.url().should('eq', `${Cypress.config().baseUrl}/shows/rewrite-external`)
  })
})
