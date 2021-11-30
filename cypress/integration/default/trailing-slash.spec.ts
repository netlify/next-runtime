describe('Trailing slash enabled', () => {
  it('should keep the trailing slash, i.e. points /old/ to /old/', () => {
    cy.visit('/old/')
    cy.url().should('eq', `${Cypress.config().baseUrl}/old/`)
  })

  it('should put a trailing slash when there is none, i.e. points /old to /old/', () => {
    cy.visit('/old')
    cy.url().should('eq', `${Cypress.config().baseUrl}/old/`)
  })
})