const getTemplate = ({ filePath, isISR }) => {
  if (isISR) {
    return `// Auto-generated file. DO NOT MODIFY.
import { getHandlerFunction } from './getHandlerFunction'
import { builder } from '@netlify/functions'
export const handler = builder(getHandlerFunction(require("./nextPage/${filePath}")))
`
  }
  return `// Auto-generated file. DO NOT MODIFY.
import { getHandlerFunction } from './getHandlerFunction'
export const handler = getHandlerFunction(require("./nextPage/${filePath}"))
  `
}

module.exports = getTemplate
