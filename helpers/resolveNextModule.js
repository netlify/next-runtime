/**
 * Try one or more Next.js imports until one is found.
 * We can't require() these normally, because the "next" package might not be resolvable from the root of a monorepo
 */
const resolveNextModule = (modules, nextRoot) => {
  if (!Array.isArray(modules)) {
    // eslint-disable-next-line no-param-reassign
    modules = [modules]
  }
  for (const key in modules) {
    const module = modules[key]
    // Get the default list of require paths...
    const paths = require.resolve.paths(module)
    // ...add the root of the Next site to the beginning of that list so we try it first...
    paths.unshift(nextRoot)
    // ...then resolve the module using that list of paths.
    try {
      const resolved = require.resolve(module, { paths })
      if (resolved) {
        return resolved
      }
    } catch (error) {
      // Failed. Trying next.
    }
  }

  throw new Error(`Could not resolve Next module. Tried "${modules.join(', ')}"`)
}

module.exports = resolveNextModule
