describe('Trailing slash enabled', () => {
  it('should keep the trailing slash, i.e. points /static/ to /static/', () => {
    cy.visit('/static/')
    cy.url().should('eq', `${Cypress.config().baseUrl}/static/`)
  })

  it('should put a trailing slash when there is none, i.e. points /static to /static/', () => {
    cy.visit('/static')
    cy.url().should('eq', `${Cypress.config().baseUrl}/static/`)
  })
})