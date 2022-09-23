describe('Static Routing', () => {
  it('renders correct page via SSR on a static route', () => {
    cy.request('/getServerSideProps/static/').then((res) => {
      expect(res.status).to.eq(200)
      expect(res.headers).to.have.property('x-render-mode', 'ssr')
      expect(res.body).to.contain('Sleepy Hollow')
    })
  })
  it('serves correct static file on a static route', () => {
    cy.request('/getStaticProps/static/').then((res) => {
      expect(res.status).to.eq(200)
      expect(res.headers).to.not.have.property('x-render-mode')
      expect(res.body).to.contain('Dancing with the Stars')
    })
  })
  it('renders correct page via ODB on a static route', () => {
    cy.request('/getStaticProps/with-revalidate/').then((res) => {
      expect(res.status).to.eq(200)
      expect(res.headers).to.have.property('x-render-mode', 'isr')
      expect(res.body).to.contain('Dancing with the Stars')
    })
  })
})

describe('Dynamic Routing', () => {
  it('renders correct page via SSR on a dynamic route', () => {
    cy.request('/getServerSideProps/1/').then((res) => {
      expect(res.status).to.eq(200)
      expect(res.headers).to.have.property('x-render-mode', 'ssr')
      expect(res.body).to.contain('Under the Dome')
    })
  })
  it('renders correct page via SSR on a dynamic catch-all route', () => {
    cy.request('/getServerSideProps/all/1/').then((res) => {
      expect(res.status).to.eq(200)
      expect(res.headers).to.have.property('x-render-mode', 'ssr')
      expect(res.body).to.contain('Under the Dome')
    })
  })
  it('serves correct static file on a prerendered dynamic route with fallback: false', () => {
    cy.request('/getStaticProps/1/').then((res) => {
      expect(res.status).to.eq(200)
      expect(res.headers).to.not.have.property('x-render-mode')
      expect(res.body).to.contain('Under the Dome')
    })
  })
  it('renders custom 404 on a non-prerendered dynamic route with fallback: false', () => {
    cy.request({ url: '/getStaticProps/3/', failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(404)
      expect(res.headers).to.have.property('x-render-mode', 'odb')
      expect(res.body).to.contain('Custom 404')
    })
  })
  it('serves correct static file on a prerendered dynamic route with fallback: true', () => {
    cy.request('/getStaticProps/withFallback/1/').then((res) => {
      expect(res.status).to.eq(200)
      expect(res.headers).to.not.have.property('x-render-mode')
      expect(res.body).to.contain('Under the Dome')
    })
  })
  it('renders fallback page via ODB on a non-prerendered dynamic route with fallback: true', () => {
    cy.request('/getStaticProps/withFallback/3/').then((res) => {
      expect(res.status).to.eq(200)
      // expect 'odb' until https://github.com/netlify/pillar-runtime/issues/438 is fixed
      expect(res.headers).to.have.property('x-render-mode', 'odb')
      // expect 'Bitten' until the above is fixed and we can test for fallback 'Loading...' message
      expect(res.body).to.contain('Bitten')
    })
  })
  it('serves correct static file on a prerendered dynamic route with fallback: blocking', () => {
    cy.request('/getStaticProps/withFallbackBlocking/1/').then((res) => {
      expect(res.status).to.eq(200)
      expect(res.headers).to.not.have.property('x-render-mode')
      expect(res.body).to.contain('Under the Dome')
    })
  })
  it('renders correct page via ODB on a non-prerendered dynamic route with fallback: blocking', () => {
    cy.request('/getStaticProps/withFallbackBlocking/3/').then((res) => {
      expect(res.status).to.eq(200)
      expect(res.headers).to.have.property('x-render-mode', 'odb')
      expect(res.body).to.contain('Bitten')
    })
  })
  it('renders correct page via ODB on a prerendered dynamic route with revalidate and fallback: false', () => {
    cy.request('/getStaticProps/withRevalidate/1/').then((res) => {
      expect(res.status).to.eq(200)
      expect(res.headers).to.have.property('x-render-mode', 'isr')
      expect(res.body).to.contain('Under the Dome')
    })
  })
  it('renders custom 404 on a non-prerendered dynamic route with revalidate and fallback: false', () => {
    cy.request({ url: '/getStaticProps/withRevalidate/3/', failOnStatusCode: false }).then((res) => {
      expect(res.status).to.eq(404)
      expect(res.headers).to.have.property('x-render-mode', 'odb')
      expect(res.body).to.contain('Custom 404')
    })
  })
  it('renders correct page via ODB on a prerendered dynamic route with revalidate and fallback: true', () => {
    cy.request('/getStaticProps/withRevalidate/withFallback/1/').then((res) => {
      expect(res.status).to.eq(200)
      expect(res.headers).to.have.property('x-render-mode', 'isr')
      expect(res.body).to.contain('Under the Dome')
    })
  })
  it('renders fallback page via ODB on a non-prerendered dynamic route with revalidate and fallback: true', () => {
    cy.request('/getStaticProps/withRevalidate/withFallback/3/').then((res) => {
      expect(res.status).to.eq(200)
      expect(res.headers).to.have.property('x-render-mode', 'isr')
      // expect 'Bitten' until https://github.com/netlify/pillar-runtime/issues/438 is fixed
      expect(res.body).to.contain('Bitten')
    })
  })
  it('renders correct page via ODB on a prerendered dynamic route with revalidate and fallback: blocking', () => {
    cy.request('/getStaticProps/withRevalidate/withFallbackBlocking/1/').then((res) => {
      expect(res.status).to.eq(200)
      expect(res.headers).to.have.property('x-render-mode', 'isr')
      expect(res.body).to.contain('Under the Dome')
    })
  })
  it('renders correct page via ODB on a non-prerendered dynamic route with revalidate and fallback: blocking', () => {
    cy.request('/getStaticProps/withRevalidate/withFallbackBlocking/3/').then((res) => {
      expect(res.status).to.eq(200)
      expect(res.headers).to.have.property('x-render-mode', 'isr')
      expect(res.body).to.contain('Bitten')
    })
  })
})
