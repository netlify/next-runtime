// In production, Build plugins cannot currently require peer dependencies
// without this hack.
// See https://github.com/netlify/netlify-plugin-nextjs/issues/55
// TODO: remove once https://github.com/netlify/pod-the-builder/issues/102 is solved
const requirePeerDependency = function (IS_LOCAL, modulePath) {
  if (!IS_LOCAL) {
    return require(require.resolve(modulePath, { paths: ['.'] }))
  }

  return require(modulePath)
}

module.exports = requirePeerDependency
