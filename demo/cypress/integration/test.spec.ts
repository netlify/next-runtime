describe('TypeScript spec', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('loads home page', () => {
    cy.findByText('Next Demo!')
  })
})