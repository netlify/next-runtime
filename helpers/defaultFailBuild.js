exports.defaultFailBuild = function (message, { error }) {
  throw new Error(`${message}\n${error.stack}`)
}
