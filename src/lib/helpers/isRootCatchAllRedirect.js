// Return true if the redirect is a root level catch-all
// (e.g., /[[...slug]] or /[...slug])
const isRootCatchAllRedirect = (redirect) =>
  redirect.startsWith('/*') || (redirect.startsWith('/:') && redirect.includes('/*'))

module.exports = isRootCatchAllRedirect
