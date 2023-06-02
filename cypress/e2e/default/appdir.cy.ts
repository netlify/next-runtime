describe('appDir', () => {
  it('renders ISR appdir pages as HTML by default', () => {
    cy.request({ url: '/blog/erica/', followRedirect: false }).then((response) => {
      expect(response.headers['content-type']).to.match(/^text\/html/)
    })
  })

  it('renders static appdir pages as HTML by default', () => {
    cy.request({ url: '/blog/erica/first-post/', followRedirect: false }).then((response) => {
      expect(response.headers['content-type']).to.match(/^text\/html/)
    })
  })

  it('renders dynamic appdir pages as HTML by default', () => {
    cy.request({ url: '/blog/erica/random-post/', followRedirect: false }).then((response) => {
      expect(response.headers['content-type']).to.match(/^text\/html/)
    })
  })

  it('returns RSC data for RSC requests to ISR pages', () => {
    cy.request({
      url: '/blog/erica/',
      headers: {
        RSC: '1',
      },
      followRedirect: false,
    }).then((response) => {
      expect(response.headers).to.have.property('content-type', 'text/x-component')
    })
  })

  it.skip('returns a vary header for RSC data requests to ISR pages', () => {
    cy.request({
      url: '/blog/erica/',
      followRedirect: false,
      headers: {
        RSC: '1',
      },
    }).then((response) => {
      expect(response.headers).to.have.property('vary').contains('RSC')
    })
  })

  it.skip('returns a vary header for non-RSC data requests to ISR pages', () => {
    cy.request({
      url: '/blog/erica/',
      followRedirect: false,
    }).then((response) => {
      expect(response.headers).to.have.property('vary').contains('RSC')
    })
  })

  it('returns RSC data for RSC requests to static pages', () => {
    cy.request({
      url: '/blog/erica/first-post/',
      headers: {
        RSC: '1',
      },
      followRedirect: false,
    }).then((response) => {
      expect(response.headers).to.have.property('content-type', 'text/x-component')
    })
  })

  it('returns RSC data for RSC requests to dynamic pages', () => {
    cy.request({
      url: '/blog/erica/random-post/',
      headers: {
        RSC: '1',
      },
      followRedirect: false,
    }).then((response) => {
      expect(response.headers).to.have.property('content-type', 'text/x-component')
    })
  })

  it('correctly redirects HTML requests for ISR pages', () => {
    cy.request({ url: '/blog/erica', followRedirect: false }).then((response) => {
      expect(response.status).to.equal(308)
      expect(response.headers).to.have.property('location', '/blog/erica/')
    })
  })

  // This needs trailing slash handling to be fixed
  it.skip('correctly redirects HTML requests for static pages', () => {
    cy.request({ url: '/blog/erica/first-post', followRedirect: false }).then((response) => {
      expect(response.status).to.equal(308)
      expect(response.headers).to.have.property('location', '/blog/erica/first-post/')
    })
  })

  it('correctly redirects HTML requests for dynamic pages', () => {
    cy.request({ url: '/blog/erica/random-post', followRedirect: false }).then((response) => {
      expect(response.status).to.equal(308)
      expect(response.headers).to.have.property('location', '/blog/erica/random-post/')
    })
  })
})
