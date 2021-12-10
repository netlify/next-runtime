describe('Localization', () => {
  it('should use sub routing to determine current locale', () => {
    cy.visit('/')

    cy.findByText('The current locale is en')

    cy.visit('/fr')
    cy.findByText('The current locale is fr')
  })

  it('should use the NEXT_LOCALE cookie to determine the default locale', () => {
    cy.setCookie('NEXT_LOCALE', 'fr')
    cy.visit('/')

    cy.url().should('eq', `${Cypress.config().baseUrl}/fr/`)
    cy.findByText('The current locale is fr')
  })

  it('should use the nf_lang cookie to determine the default locale', () => {
    cy.setCookie('nf_lang', 'fr')
    cy.visit('/')

    cy.url().should('eq', `${Cypress.config().baseUrl}/fr/`)
    cy.findByText('The current locale is fr')
  })

  it('should use Accept-Language to choose a locale', () => {
    cy.visit('/', {
      headers: {
        // FIXME: switch back once libredirect bug is fixed
        'Accept-Language': 'fr-FR',
        // 'Accept-Language': 'fr-FR,fr;q=0.5',
      },
    })
    cy.url().should('eq', `${Cypress.config().baseUrl}/fr/`)
    cy.findByText('The current locale is fr')
  })

  it('should use the NEXT_LOCALE cookie over Accept-Language header to determine the default locale', () => {
    cy.setCookie('NEXT_LOCALE', 'en')
    cy.visit({
      url: '/',
      headers: {
        // FIXME: switch back once libredirect bug is fixed
        'Accept-Language': 'fr-FR',
        // 'Accept-Language': 'fr-FR,fr;q=0.5',
      },
    })
    cy.url().should('eq', `${Cypress.config().baseUrl}/`)
    cy.findByText('The current locale is en')
  })
})
