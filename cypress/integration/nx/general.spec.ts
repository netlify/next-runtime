describe('Default site', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('loads home page', () => {
    cy.findByRole('heading', { name: 'Welcome to nx-nextjs-monorepo!' })

    cy.visit('//')
    cy.url().should('eq', `${Cypress.config().baseUrl}/`)
  })

  it('serves generated public files', async () => {
    cy.request('service-worker.js').then((res) => {
      expect(res.status).to.eq(200)
      expect(res.headers['content-type']).to.match(/javascript/)
    })
  })
})
