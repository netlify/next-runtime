describe('Basepath site', () => {
  beforeEach(() => {
    cy.visit('/docs')
  })

  it('loads home page', () => {
    cy.findByText('Demo 2: Basepath')
  })

  it('should use sub routing to determine current locale', () => {
    cy.visit('/docs');

    cy.findByText('The current locale is en')

    cy.visit('/docs/fr')
    cy.findByText('The current locale is fr')
  })

  it('should use the NEXT_LOCALE cookie to determine the default locale', () => {
    cy.setCookie('NEXT_LOCALE', 'fr')
    cy.visit('/docs/fr');
    cy.findByText('The current locale is fr')
  })
})