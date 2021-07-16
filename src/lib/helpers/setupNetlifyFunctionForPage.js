const { join } = require('path')

const { copySync, writeFile, ensureDir, copy } = require('fs-extra')

const { TEMPLATES_DIR } = require('../config')
const getTemplate = require('../templates/getTemplate')

const copyDynamicImportChunks = require('./copyDynamicImportChunks')
const getNetlifyFunctionName = require('./getNetlifyFunctionName')
const getNextDistDir = require('./getNextDistDir')
const { logItem } = require('./logger')

// Create a Netlify Function for the page with the given file path
const setupNetlifyFunctionForPage = async ({ filePath, functionsPath, isApiPage, isISR }) => {
  // Set function name based on file path
  const functionName = getNetlifyFunctionName(filePath, isApiPage)
  const functionDirectory = join(functionsPath, functionName)

  await ensureDir(functionDirectory)

  if (isApiPage && functionName.endsWith('-background')) {
    logItem(`👁 Setting up API page ${functionName} as a Netlify background function`)
  }

  // Write entry point to function directory
  const entryPointPath = join(functionDirectory, `${functionName}.ts`)
  await writeFile(entryPointPath, getTemplate({ filePath, isISR }))

  // Copy function helper
  await copy(join(TEMPLATES_DIR, 'getHandlerFunction.js'), join(functionDirectory, 'getHandlerFunction.js'))

  // Copy any dynamic import chunks
  await copyDynamicImportChunks(functionDirectory)

  // Copy page to our custom path
  const nextPageCopyPath = join(functionDirectory, 'nextPage', filePath)
  const nextDistDir = await getNextDistDir()

  copySync(join(nextDistDir, 'serverless', filePath), nextPageCopyPath)
}

module.exports = setupNetlifyFunctionForPage
