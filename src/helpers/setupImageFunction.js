const { join } = require('path')

const { copyFile, writeJSON, ensureDir } = require('fs-extra')

const { IMAGE_FUNCTION_NAME } = require('../constants')

const DEFAULT_FUNCTIONS_SRC = 'netlify/functions'

// Move our next/image function into the correct functions directory
const setupImageFunction = async ({
  constants: { INTERNAL_FUNCTIONS_SRC, FUNCTIONS_SRC = DEFAULT_FUNCTIONS_SRC },
  imageconfig = {},
  netlifyConfig,
}) => {
  const functionsPath = INTERNAL_FUNCTIONS_SRC || FUNCTIONS_SRC
  const functionName = `${IMAGE_FUNCTION_NAME}.js`
  const functionDirectory = join(functionsPath, IMAGE_FUNCTION_NAME)

  await ensureDir(functionDirectory)
  await writeJSON(join(functionDirectory, 'imageconfig.json'), imageconfig)
  await copyFile(join(__dirname, '..', 'templates', 'ipx.js'), join(functionDirectory, functionName))

  const imagePath = imageconfig.path || '/_next/image'

  netlifyConfig.redirects.push(
    {
      from: `${imagePath}*`,
      query: { url: ':url', w: ':width', q: ':quality' },
      to: `/${IMAGE_FUNCTION_NAME}/w_:width,q_:quality/:url`,
      status: 301,
    },
    {
      from: `/${IMAGE_FUNCTION_NAME}/*`,
      to: `/.netlify/functions/${IMAGE_FUNCTION_NAME}`,
      status: 200,
    },
  )
}

module.exports = setupImageFunction
