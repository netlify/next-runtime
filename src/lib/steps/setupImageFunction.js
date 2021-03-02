const { copySync } = require('fs-extra')
const { join } = require('path')
const { NEXT_IMAGE_FUNCTION_NAME, TEMPLATES_DIR } = require('../config')

// Move our next/image function into the correct functions directory
const setupImageFunction = (functionsPath) => {
  const functionName = `${NEXT_IMAGE_FUNCTION_NAME}.js`
  const functionDirectory = join(functionsPath, functionName)

  copySync(join(TEMPLATES_DIR, 'imageFunction.js'), functionDirectory, {
    overwrite: false,
    errorOnExist: true,
  })
}

module.exports = setupImageFunction
