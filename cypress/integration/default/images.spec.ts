/**
 * @see {@link https://nextjs.org/docs/api-reference/next/image#required-props}
 */
describe('next/images', () => {
  it('should show static image from /public', () => {
    cy.visit('/')
    cy.findByRole('img')
      .should('be.visible')
      .and(($img) => {
        // "naturalWidth" and "naturalHeight" are set when the image loads
        expect($img[0].naturalWidth, 'image has natural width').to.be.greaterThan(0)
      })
  })

  it('should show image using next/image', () => {
    cy.visit('/image')
    cy.findByRole('img', { name: /shiba inu dog looks through a window/i })
  })

  it('should show image allow-listed with remotePatterns', () => {
    cy.visit('/image')
    cy.findByRole('img', { name: /shiba inu dog looks through a window/i })
      .should('be.visible')
      .and(($img) => {
        // "naturalWidth" and "naturalHeight" are set when the image loads
        expect($img[0].naturalWidth, 'image has natural width').to.be.greaterThan(0)
      })
  })

  it('should show throw if an image is not on the domains or remotePatterns allowlist', () => {
    cy.visit('/broken-image')

    // The image renders broken on the site
    cy.findByRole('img', { name: /picture of the author/i }).then(($img) => {
      // eslint-disable-next-line promise/no-nesting
      cy.request({ url: $img[0].src, failOnStatusCode: false }).then((response) => {
        // Navigating to the image itself give a forbidden error with a message explaining why.
        expect(response.status).to.eq(403)
        expect(response.body).to.include(
          'URL not on allowlist: https://netlify-plugin-nextjs-demo.netlify.app/next-on-netlify.png',
        )
      })
    })
  })
})
