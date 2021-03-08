// Loads a page and removes all Javascript
// Adapted from https://glebbahmutov.com/blog/ssr-e2e/
Cypress.Commands.add('ssr', (url) => {
  cy.request(url)
    .its('body')
    .then((html) => {
      // remove all <script> tags
      // Copied from https://stackoverflow.com/a/6660315/6451879
      html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      cy.state('document').write(html)
    })

  // Verify that there are no scripts present
  cy.get('script').should('not.exist')
})

// NextJS sends cookies with secure: true and Cypress does not send them to
// the browser, because we are making requests to http:localhost:8888.
// I briefly considered proxy-ing all requests via https using local-ssl-proxy
// or similar, but I would prefer sticking as closely to `netlify dev` as
// possible. Thus, this command to make tests with preview cookies work.
Cypress.Commands.add('makeCookiesWorkWithHttpAndReload', () => {
  // First, remove secure attribute from all cookies
  cy.getCookies().then((cookies) =>
    cookies.forEach(({ name, value, secure, sameSite, ...options }) => cy.setCookie(name, value, options)),
  )

  // Then reload the page (with our new, "non-secure" cookies)
  cy.reload()
})
