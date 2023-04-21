/**
 * @see {@link https://nextjs.org/docs/api-reference/next/image#required-props}
 */
describe('next/images', () => {
  it('should show image from /public', () => {
    cy.visit('/')
    cy.findByRole('img').should('be.visible').and(($img) => {
      // "naturalWidth" and "naturalHeight" are set when the image loads
      expect(
        $img[0].naturalWidth,
        'image has natural width'
      ).to.be.greaterThan(0)
    })
  })
})
