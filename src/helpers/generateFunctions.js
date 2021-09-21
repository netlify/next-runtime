const path = require('path')

const { copyFile, ensureDir, writeFile } = require('fs-extra')

const { HANDLER_FUNCTION_NAME, ODB_FUNCTION_NAME } = require('../constants')

const getHandler = require('./getHandler')

const DEFAULT_FUNCTIONS_SRC = 'netlify/functions'

const generateFunctions = async ({ FUNCTIONS_SRC = DEFAULT_FUNCTIONS_SRC, INTERNAL_FUNCTIONS_SRC }) => {
  const FUNCTION_DIR = INTERNAL_FUNCTIONS_SRC || FUNCTIONS_SRC
  const bridgeFile = require.resolve('@vercel/node/dist/bridge')

  const writeHandler = async (func, isODB) => {
    const handlerSource = await getHandler(isODB)
    await ensureDir(path.join(FUNCTION_DIR, func))
    await writeFile(path.join(FUNCTION_DIR, func, `${func}.js`), handlerSource)
    await copyFile(bridgeFile, path.join(FUNCTION_DIR, func, 'bridge.js'))
  }

  await writeHandler(HANDLER_FUNCTION_NAME, false)
  await writeHandler(ODB_FUNCTION_NAME, true)
}

module.exports = generateFunctions
