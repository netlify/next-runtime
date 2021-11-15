/**
 * @see {@link https://nextjs.org/docs/advanced-features/custom-error-page}
 */
 describe('Custom error pages', () => {
  it('should show custom 404 page on /404', () => {
    cy.visit('/404', {failOnStatusCode: false})
    cy.findByText('Custom 404 - Page Not Found')
  })

  it('should show custom 500 page on /500', () => {
    cy.visit('/500', {failOnStatusCode: false})
    cy.findByText('Custom 500 - Server-side error occurred')
  })
})