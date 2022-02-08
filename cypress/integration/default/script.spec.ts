describe('Environment Varialbes', () => {
  beforeEach(() => {
    cy.intercept('GET', 'https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXX').as('test-gtm')
    cy.visit('https://61f2c7c9fad2c70ee2737a81--netlify-plugin-nextjs-demo.netlify.app/script/')
  })

  it('should load a script after interactive', () => {
    cy.wait('@test-gtm')
  })
})