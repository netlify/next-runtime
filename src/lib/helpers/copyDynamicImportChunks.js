const { join } = require('path')

const { copySync, readdirSync } = require('fs-extra')

const getNextDistDir = require('./getNextDistDir')
const { logTitle } = require('./logger')

// Check if there are dynamic import chunks and copy to the necessary function dir
const copyDynamicImportChunks = async (functionPath) => {
  const nextDistDir = await getNextDistDir()
  const chunksPath = join(nextDistDir, 'serverless')
  const files = readdirSync(chunksPath)
  const chunkRegex = new RegExp(/^(\.?[-$~\w]+)+\.js$/g)
  const excludeFiles = new Set(['init-server.js.js', 'on-error-server.js.js'])
  files.forEach((file) => {
    if (!excludeFiles.has(file) && chunkRegex.test(file)) {
      logTitle('💼 Copying dynamic import chunks to', functionPath)
      copySync(join(chunksPath, file), join(functionPath, file), {
        overwrite: false,
        errorOnExist: true,
      })
    }
  })
}

module.exports = copyDynamicImportChunks
