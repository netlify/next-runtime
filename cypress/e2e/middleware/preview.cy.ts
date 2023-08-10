describe('Preview Mode', () => {
  it('enters and exits preview mode', () => {
    Cypress.Cookies.debug(true)
    cy.getCookies().then((cookie) => cy.log('cookies', cookie))

    cy.intercept('/previewTest', (req) => {
      req.continue((res) => {
        expect(res.headers?.['x-middleware-executed']).to.equal('true')
      })
    }).as('previewTestVisit')

    // preview mode is off by default
    cy.visit('/previewTest')
    cy.findByText('Is preview? No', { selector: 'h1' })

    // enter preview mode
    cy.request('/api/enterPreview').then((response) => {
      expect(response.body).to.have.property('name', 'preview mode')
    })

    // exptected content is rendered
    cy.visit('/previewTest')
    cy.findByText('Is preview? Yes!', { selector: 'h1' })

    // exit preview mode
    cy.request('/api/exitPreview')
    cy.visit('/previewTest')
    cy.findByText('Is preview? No', { selector: 'h1' })

    // we should hit /previewTest 3 times (before entering preview, after entering preview, after exiting preview)
    // this assertion is mainly to ensure interception works and assertion on response header is made
    cy.get('@previewTestVisit.all').should('have.length', 3)
  })
})
