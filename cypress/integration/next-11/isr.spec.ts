describe('ISR pages', () => {
  it('renders a 404 from an ISR page with TTL=60', () => {
    cy.request('/isr-not-found').then((res) => {
      expect(res.status).to.eq(404)
      expect(res.headers).to.have.property('x-nf-render-mode', 'odb ttl=60')
    })
  })
})
