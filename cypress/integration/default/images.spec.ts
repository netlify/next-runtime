/**
 * @see {@link https://nextjs.org/docs/api-reference/next/image#required-props}
 */
describe('next/images', () => {
  it('should show static image from /public', () => {
    cy.visit('/')
    cy.findByRole('img').should('be.visible').and(($img) => {
      // "naturalWidth" and "naturalHeight" are set when the image loads
      expect(
        $img[0].naturalWidth,
        'image has natural width'
      ).to.be.greaterThan(0)
    })
  })

  it('should show image using next/image', () => {
    cy.visit('/image')
    cy.findByRole('img', { name: /shiba inu dog looks through a window/i })
  })

  it('should show image allow-listed with remotePatterns', () => {
    cy.visit('/image')
    cy.findByRole('img',{ name: /tawny frogmouth/i }).should('be.visible').and(($img) => {
      // "naturalWidth" and "naturalHeight" are set when the image loads
      expect(
        $img[0].naturalWidth,
        'image has natural width'
      ).to.be.greaterThan(0)
    })
  })

  it('should show a broken image if it is not on domains or remotePatterns allowlist', () => {
    cy.visit('/image')
    // Scroll to view image in cypress snapshot
    cy.scrollTo('bottom')
    cy.findByRole('img',{ name: /jellybeans/i }).should('be.visible').and(($img) => {
      // "naturalWidth" and "naturalHeight" are set when the image loads, so should be 0 if image doesn't load
      cy.log(JSON.stringify($img[0]))
      expect(
        $img[0].naturalWidth,
        'image has natural width'
      ).to.equal(0)
    })
  })
})
