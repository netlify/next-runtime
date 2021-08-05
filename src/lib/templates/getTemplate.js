const getTemplate = ({ filePath, isODB }) => {
  if (isODB) {
    return `// Auto-generated file. DO NOT MODIFY.
const { getHandlerFunction } = require('./getHandlerFunction')
const { builder } = require('@netlify/functions')
exports.handler = builder(getHandlerFunction(require("./nextPage/${filePath}")))
`
  }
  return `// Auto-generated file. DO NOT MODIFY.
const { getHandlerFunction } = require('./getHandlerFunction')
exports.handler = getHandlerFunction(require("./nextPage/${filePath}"))
  `
}

module.exports = getTemplate
