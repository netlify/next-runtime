import { NextRequest } from 'next/server'
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
    cy.visit('/static')
    cy.get('#message').contains('This was static but has been transformed in')
    cy.contains("This is an ad that isn't shown by default")
  })

  it('modifies the page props', () => {
    cy.request('/_next/data/build-id/en/static.json').then((response) => {
      expect(response.body).to.have.nested.property('pageProps.showAd', true)
      expect(response.body)
        .to.have.nested.property('pageProps.message')
        .that.includes('This was static but has been transformed in')
    })
  })

  it('adds geo data', () => {
    cy.request('/api/geo-test').then((response) => {
      expect(response.body).to.have.nested.property('headers.x-geo-country')
      expect(response.body).to.have.nested.property('headers.x-geo-region')
      expect(response.body).to.have.nested.property('headers.x-geo-city')
      expect(response.body).to.have.nested.property('headers.x-geo-longitude')
      expect(response.body).to.have.nested.property('headers.x-geo-latitude')
      expect(response.body).to.have.nested.property('headers.x-geo-timezone')
    })
  })
})
