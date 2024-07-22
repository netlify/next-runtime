const { parse: pathParse } = require('node:path')

const fileBase = pathParse(__filename).base

module.exports = {
  fileBase,
  // if fileBase is not the same as this module name, it was bundled
  isBundled: fileBase !== 'cjs-file-with-js-extension.js',
}
