describe('On-demand revalidation', () => {
  it('revalidates static ISR route with default locale', () => {
    cy.request({ url: '/api/revalidate/?select=0' }).then((res) => {
      expect(res.status).to.eq(200)
      expect(res.body).to.have.property('message', 'success')
    })
  })
  it('revalidates static ISR route with non-default locale', () => {
    cy.request({ url: '/api/revalidate/?select=1' }).then((res) => {
      expect(res.status).to.eq(200)
      expect(res.body).to.have.property('message', 'success')
    })
  })
  it('revalidates root static ISR route with default locale', () => {
    cy.request({ url: '/api/revalidate/?select=2' }).then((res) => {
      expect(res.status).to.eq(200)
      expect(res.body).to.have.property('message', 'success')
    })
  })
  it('revalidates root static ISR route with non-default locale', () => {
    cy.request({ url: '/api/revalidate/?select=3' }).then((res) => {
      expect(res.status).to.eq(200)
      expect(res.body).to.have.property('message', 'success')
    })
  })
  it('revalidates dynamic prerendered ISR route with default locale', () => {
    cy.request({ url: '/api/revalidate/?select=4' }).then((res) => {
      expect(res.status).to.eq(200)
      expect(res.body).to.have.property('message', 'success')
    })
  })
  it('fails to revalidate dynamic non-prerendered ISR route with fallback false', () => {
    cy.request({ url: '/api/revalidate/?select=5', failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(500)
      expect(res.body).to.have.property('message')
      expect(res.body.message).to.include('could not refresh content for path /getStaticProps/withRevalidate/3/, path is not handled by an odb')
    })
  })
  it('revalidates dynamic non-prerendered ISR route with fallback blocking', () => {
    cy.request({ url: '/api/revalidate/?select=6' }).then((res) => {
      expect(res.status).to.eq(200)
      expect(res.body).to.have.property('message', 'success')
    })
  })
  it('revalidates dynamic non-prerendered ISR route with fallback blocking and non-default locale', () => {
    cy.request({ url: '/api/revalidate/?select=7' }).then((res) => {
      expect(res.status).to.eq(200)
      expect(res.body).to.have.property('message', 'success')
    })
  })
  it('revalidates dynamic prerendered appDir route', () => {
    cy.request({ url: '/api/revalidate/?select=8' }).then((res) => {
      expect(res.status).to.eq(200)
      expect(res.body).to.have.property('message', 'success')
    })
  })
  it('fails to revalidate dynamic non-prerendered appDir route', () => {
    cy.request({ url: '/api/revalidate/?select=9' }).then((res) => {
      expect(res.status).to.eq(200)
      expect(res.body).to.have.property('message', 'success')
    })
  })
  it('revalidates dynamic prerendered appDir route with catch-all params', () => {
    cy.request({ url: '/api/revalidate/?select=10' }).then((res) => {
      expect(res.status).to.eq(200)
      expect(res.body).to.have.property('message', 'success')
    })
  })
})
