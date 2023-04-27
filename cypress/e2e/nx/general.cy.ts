describe('Default site', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('loads home page', () => {
    cy.findByRole('heading', { name: 'Hello there, Welcome demo-monorepo 👋' })

    cy.visit('//')
    cy.url().should('eq', `${Cypress.config().baseUrl}/`)
  })

  it('serves generated public files', () => {
    cy.request('favicon.ico').then((res) => {
      expect(res.status).to.eq(200)
      expect(res.headers['content-type']).to.match(/image/)
    })
  })

  it('serves API routes', () => {
    cy.request('/api/hello').then((res) => {
      expect(res.status).to.eq(200)
      expect(res.body).to.deep.eq({ body: 'Hello world' })
    })
  })
})
