'use client'

export const TestElement = ({ children, testid }) => {
  return <div data-testid={testid}>{children}</div>
}
