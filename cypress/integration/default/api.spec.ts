describe('Extended API routes', () => {
  it('returns HTTP 202 Accepted for background route', () => {
    cy.request('/api/hello-background').then((response) => {
      expect(response.status).to.equal(202)
    })
  })
  it('returns 404 for scheduled route', () => {
    cy.request('/api/hello-scheduled').then((response) => {
      expect(response.status).to.equal(404)
    })
  })
})
