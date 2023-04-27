describe('Layouts', () => {
  beforeEach(() => {
    cy.visit('/layouts')
  })

  it('should properly have a layout and title change', () => {
    cy.findByText(/Test layout wrapper/i)
    cy.title().should('eq', 'Per Page Layout test title')
  })
})