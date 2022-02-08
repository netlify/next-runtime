describe('Middleware', () => {
  beforeEach(() => {
    cy.request('/middle')
  })

  it('should properly load custom headers', () => {
    cy.request({
      url: '/',
    }).then((response) => {
      expect(response.headers).to.have.property('x-custom-1', 'value-1')
      expect(response.headers).to.have.property('x-custom-2', 'value-2')
      expect(response.headers).to.have.property('x-custom-3', 'value-3')
      expect(response.headers).to.have.property('x-custom-4', 'value-4')
    })
  })
})