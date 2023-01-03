describe('appDir', () => {
  it('renders appdir pages using SSR', () => {
    cy.request('/blog/erica/first-post/').then((response) => {
      expect(response.headers).to.have.property('x-nf-render-mode', 'ssr')
      expect(response.headers).to.have.property('content-type', 'text/html; charset=utf-8')
    })
  })

  it('returns RSC data for RSC requests', () => {
    cy.request('/blog/erica/first-post/', {
      Headers: {
        RSC: '1',
      },
    }).then((response) => {
      expect(response.headers).to.have.property('x-nf-render-mode', 'ssr')
      expect(response.headers).to.have.property('content-type', 'application/octet-stream')
    })
  })
})
