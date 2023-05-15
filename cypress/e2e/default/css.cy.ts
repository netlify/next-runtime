describe('CSS handling', () => {
  beforeEach(() => {
    cy.visit('/css')
  })

  it('should properly handle css', () => {
    // Sass variable loaded
    cy.findByText(/✅ Sass variable imported, color: #64FF00/i)

    // CSS-in-JS loaded
    cy.findByTestId('css-in-js').should('have.css', 'background', 'rgb(255, 165, 0) none repeat scroll 0% 0% / auto padding-box border-box')
  })
})