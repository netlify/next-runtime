describe('Localization', () => {
  it('should use sub routing to determine current locale', () => {
    cy.visit('/');

    cy.findByText('The current locale is en')

    cy.visit('/fr')
    cy.findByText('The current locale is fr')
  })

  it('should use the NEXT_LOCALE cookie to determine the default locale', () => {
    cy.setCookie('NEXT_LOCALE', 'fr')
    cy.visit('/');

    cy.findByText('The current locale is fr')
  })

  it('should use the NEXT_LOCALE cookie over Accept-Language header to determine the default locale', () => {
    // cy.setCookie('NEXT_LOCALE', 'en')
    cy.visit({
      url: '/',
      headers: {
        'Accept-Language': 'fr;q=0.9'
      }
    });
    cy.findByText('The current locale is fr')

    cy.setCookie('NEXT_LOCALE', 'en')
    cy.visit({
      url: '/',
      headers: {
        'Accept-Language': 'fr;q=0.9'
      }
    });

    cy.findByText('The current locale is en')
  })
})