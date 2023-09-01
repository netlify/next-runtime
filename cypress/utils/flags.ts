export const allFlagsEnabled = Cypress.env('PLUGIN_ALL_FEATURE_FLAGS') === `enabled`

/**
 * @param shouldExecute {boolean} - if truthy, `describe` will be executed, otherwise skipped
 * @returns {function} - describe or describe.skip
 * @example
 * // this will execute the describe block only if CDNCacheControlEnabled variable is falsy
 * describeConditional(!CDNCacheControlEnabled)('describe block name', () => {
 * }
 */
export const describeConditional = function describeConditional(shouldExecute: boolean) {
  return shouldExecute ? describe : describe.skip
}

/**
 * @param shouldExecute {boolean} - if truthy, `it` will be executed, otherwise skipped
 * @returns {function} - it or it.skip
 * @example
 * // this will execute the test only if CDNCacheControlEnabled variable is falsy
 * itConditional(!CDNCacheControlEnabled)('test name', () => {
 * }
 */
export const itConditional = function itConditional(shouldExecute: boolean) {
  return shouldExecute ? it : it.skip
}
