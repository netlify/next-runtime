describe('TypeScript spec', () => {
  it('works', () => {
    cy.wrap('foo').should('equal', 'foo')
  })

  it('test', () => {
    expect(10).to.equal(10)
  })
})