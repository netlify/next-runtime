describe('Enhanced middleware', () => {
  it('rewrites the response body using request.rewrite()', () => {
    cy.visit('/request-rewrite')
    cy.get('#message').contains('This was static (& escaping test &amp;) but has been transformed in')
    cy.contains("This is an ad that isn't shown by default")
  })

  it('modifies the page props when using request.rewrite()', () => {
    cy.visit('/request-rewrite')
    const data = cy.get('script#__NEXT_DATA__')
    data.should('contain', '"message":"This was static (& escaping test &amp;) but has been transformed in Arlington","showAd":true')
  })

  it.skip('passes in headers within request.rewrite()', () => {
    cy.request('/request-rewrite').then((response) => {
      expect(response.headers).to.have.property('x-rewrite-test', 'hello')
    })
  })


  it('rewrites the response body using request.next()', () => {
    cy.visit('/static')
    cy.get('#message').contains('This was static (& escaping test &amp;) but has been transformed in')
    cy.contains("This is an ad that isn't shown by default")
  })

  it('modifies the page props', () => {
    cy.request('/_next/data/build-id/en/static.json').then((response) => {
      expect(response.body).to.have.nested.property('pageProps.showAd', true)
      expect(response.body)
        .to.have.nested.property('pageProps.message')
        .that.includes('This was static (& escaping test &amp;) but has been transformed in')
    })
  })

  it('adds geo data', () => {
    cy.request('/api/geo').then((response) => {
      expect(response.body).to.have.nested.property('headers.x-geo-country')
      expect(response.body).to.have.nested.property('headers.x-geo-region')
      expect(response.body).to.have.nested.property('headers.x-geo-city')
      expect(response.body).to.have.nested.property('headers.x-geo-longitude')
      expect(response.body).to.have.nested.property('headers.x-geo-latitude')
      expect(response.body).to.have.nested.property('headers.x-geo-timezone')
    })
  })

  it('handles uppercase i18n redirects properly ', () => {
    cy.visit('/de-DE/static')
    cy.get('#message').contains('This was static (& escaping test &amp;) but has been transformed in')
    cy.contains("This is an ad that isn't shown by default")
  })

  it('handles lowercase i18n redirects properly ', () => {
    cy.visit('/de-de/static')
    cy.get('#message').contains('This was static (& escaping test &amp;) but has been transformed in')
    cy.contains("This is an ad that isn't shown by default")
  })
})
