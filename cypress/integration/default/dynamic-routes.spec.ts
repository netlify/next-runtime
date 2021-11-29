describe('Dynamic Routing', () => {
  it('loads page', () => {
    cy.visit('/shows/250')
    cy.findByRole('heading').should('contain', '250')
    cy.findByText('Kirby Buckets')
  })
})