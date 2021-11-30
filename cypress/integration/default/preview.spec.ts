describe('Preview Mode', () => {
  it('enters and exits preview mode', () => {
    // preview mode is off by default
    cy.visit('/previewTest')
    cy.findByText('Is preview? No')

    // enter preview mode
    cy.request('/api/enterPreview').then(
  (response) => {
    expect(response.body).to.have.property('name', 'preview mode')
  }
)
  cy.visit('/previewTest')
  cy.findByText('Is preview? Yes!')

  // exit preview mode
  cy.request('/api/exitPreview')
  cy.visit('/previewTest')
  cy.findByText('Is preview? No')
  })
})