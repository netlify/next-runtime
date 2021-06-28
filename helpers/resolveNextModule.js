/**
 * We can't require() these normally, because the "next" package might not be resolvable from the root of a monorepo
 */
const resolveNextModule = (module, nextRoot) => {
  // Get the default list of require paths...
  const paths = require.resolve.paths(module)
  // ...add the root of the Next site to the beginning of that list so we try it first...
  paths.unshift(nextRoot)
  // ...then resolve the module using that list of paths.
  return require.resolve(module, { paths })
}

module.exports = resolveNextModule
