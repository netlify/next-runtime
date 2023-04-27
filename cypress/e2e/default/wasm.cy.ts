describe('WebAssembly support', () => {
  it('generates an API route with wasm chunks', () => {
    cy.request('/api/og?username=netlify').then((response) => {
      // Failure state is zero-length body
      expect(response.body).to.have.length.above(10000)
    })
  })
})
