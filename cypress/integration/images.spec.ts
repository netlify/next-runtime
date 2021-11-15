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
})