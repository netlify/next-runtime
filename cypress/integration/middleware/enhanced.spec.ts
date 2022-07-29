describe('Enhanced middleware', () => {
  it('adds request headers', () => {
    cy.request('/api/hello').then((response) => {
      expect(response.body).to.have.nested.property('headers.x-hello', 'world')
    })
  })

  it('adds request headers to a rewrite', () => {
    cy.request('/headers').then((response) => {
      expect(response.body).to.have.nested.property('headers.x-hello', 'world')
    })
  })

  it('rewrites the response body', () => {
    cy.on('uncaught:exception', (err, runnable) => {
      console.log(err.message)
    })
    cy.visit('/static')
    cy.findByText('This was static but has been transformed in')
    cy.findByText("This is an ad that isn't shown by default")
  })

  it('modifies the page props', () => {
    cy.request('/_next/data/build-id/static.json').then((response) => {
      expect(response.body).to.have.nested.property('pageProps.showAd', true)
      expect(response.body)
        .to.have.nested.property('pageProps.message')
        .that.includes('This was static but has been transformed in')
    })
  })
})
