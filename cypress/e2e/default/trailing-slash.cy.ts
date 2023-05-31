describe('Trailing slash enabled', () => {
  it('should keep the trailing slash, i.e. points /blog/erica/ to /blog/erica/', () => {
    cy.visit('/blog/erica/')
    cy.url().should('eq', `${Cypress.config().baseUrl}/blog/erica/`)
  })

  it('should put a trailing slash when there is none, i.e. points /blog/erica to /blog/erica/', () => {
    cy.visit('/blog/erica')
    cy.url().should('eq', `${Cypress.config().baseUrl}/blog/erica/`)
  })
})