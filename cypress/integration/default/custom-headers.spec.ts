describe('custom headers', () => {
  it('should load custom headers for an SSG page', () => {
    cy.request('/').then((request) => {
      cy.wrap(request.headers['x-custom-header']).should('equal', 'my custom header value')
      cy.wrap(request.headers['x-custom-header-for-everything']).should(
        'equal',
        'my custom header for everything value',
      )
    })
  })

  it('should load custom headers for a Netlify function', () => {
    cy.request('/api/hello/').then((request) => {
      cy.wrap(request.headers['x-custom-api-header']).should('equal', 'my custom api header value')
      cy.wrap(request.headers['x-custom-header-for-everything']).should(
        'equal',
        'my custom header for everything value',
      )
    })
  })

  it('should load custom headers for an SSR page', () => {
    cy.request('/shows/250').then((request) => {
      cy.wrap(request.headers['x-custom-header-for-everything']).should(
        'equal',
        'my custom header for everything value',
      )
    })
  })
})
