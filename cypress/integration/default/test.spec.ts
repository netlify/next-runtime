describe('TypeScript spec', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('loads home page', () => {
    cy.findByText('NextJS on Netlify (imported Header component)')
  })
})