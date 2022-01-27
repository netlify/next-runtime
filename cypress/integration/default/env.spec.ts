describe('Environment Varialbes', () => {
  beforeEach(() => {
    cy.visit('/env')
  })

  it('should show a public environment token and not show private ones', () => {
    cy.findByText('Greetings Local cool dev')
    cy.findByText('Everything worked')
  })
})