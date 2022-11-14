describe('ISR pages', () => {
  it('renders a 404 from an ISR page with TTL=60', () => {
    cy.request({ url: '/isr-not-found', failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(404)
      expect(res.headers).to.have.property('x-nf-render-mode', 'odb ttl=60')
    })
  })
})
