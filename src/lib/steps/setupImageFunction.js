const { join } = require('path')

const { copyFile, writeJSON, ensureDir } = require('fs-extra')

const { NEXT_IMAGE_FUNCTION_NAME, TEMPLATES_DIR } = require('../config')

// Move our next/image function into the correct functions directory
const setupImageFunction = async (functionsPath, imageconfig = {}) => {
  const functionName = `${NEXT_IMAGE_FUNCTION_NAME}.js`
  const functionDirectory = join(functionsPath, NEXT_IMAGE_FUNCTION_NAME)

  await ensureDir(functionDirectory)
  await writeJSON(join(functionDirectory, 'imageconfig.json'), imageconfig)
  await copyFile(join(TEMPLATES_DIR, 'imageFunction.js'), join(functionDirectory, functionName))
}

module.exports = setupImageFunction
