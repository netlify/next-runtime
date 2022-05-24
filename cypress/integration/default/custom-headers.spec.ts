describe('custom headers', () => {
  it('should load custom headers', () => {
    cy.request('/').then((request) => {
      cy.wrap(request.headers['x-custom-header']).should('equal', 'my custom header value')
    })
  })
})
