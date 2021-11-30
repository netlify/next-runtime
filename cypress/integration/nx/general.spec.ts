describe('Default site', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('loads home page', () => {
    cy.findByText('Welcome to nx-nextjs-monorepo!')

    cy.visit('//')
    cy.url().should('eq', `${Cypress.config().baseUrl}/`)
  })
})