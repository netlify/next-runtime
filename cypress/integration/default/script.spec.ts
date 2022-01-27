describe('Environment Varialbes', () => {
  beforeEach(() => {
    cy.visit('/script')
  })

  it('should load a script after interactive', () => {
    cy.intercept('GET', 'https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXX').as('test-gtm')

    cy.wait('@test-gtm')

  })
})