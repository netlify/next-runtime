describe('TypeScript spec', () => {
  it('works', () => {
    cy.wrap('foo').should('equal', 'foo')
  })
})