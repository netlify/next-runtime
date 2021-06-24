/**
 * We can't require() these normally, because the "next" package might not be resolvable from the root of a monorepo
 */
const requireNextModule = (module, nextRoot) => {
  const resolved = require.resolve(module, { paths: [nextRoot, process.cwd()] })
  if (resolved) {
    // eslint-disable-next-line import/no-dynamic-require
    return require(resolved)
  }
  throw new Error(`Could not load module ${module}`)
}

module.exports = requireNextModule
