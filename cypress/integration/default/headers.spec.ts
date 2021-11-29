describe('Headers', () => {
  it('should set headers from the next.config.js', () => {
    cy.request({
      url: '/',
    }).then((response) => {
      expect(response.headers).to.have.property('x-custom-header', 'my custom header value')
    })
  })
})