describe('appDir', () => {
  it('renders appdir pages as HTML by default', () => {
    cy.request('/blog/erica/first-post/').then((response) => {
      expect(response.headers['content-type']).to.match(/^text\/html/)
    })
  })

  it('returns RSC data for RSC requests', () => {
    cy.request({
      url: '/blog/erica/first-post/',
      headers: {
        RSC: '1',
      },
    }).then((response) => {
      expect(response.headers).to.have.property('content-type', 'application/octet-stream')
    })
  })
})
