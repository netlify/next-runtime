const { join } = require('path')
const { copySync, readdirSync } = require('fs-extra')
const { logTitle } = require('../helpers/logger')
const getNextDistDir = require('./getNextDistDir')

// Check if there are dynamic import chunks and copy to the necessary function dir
const copyDynamicImportChunks = async (functionPath) => {
  const nextDistDir = await getNextDistDir()
  const chunksPath = join(nextDistDir, 'serverless')
  const files = readdirSync(chunksPath)
  const chunkRegex = new RegExp(/^(\.?[-_$~A-Z0-9a-z]+){1,}\.js$/g)
  const excludeFiles = ['init-server.js.js', 'on-error-server.js.js']
  files.forEach((file) => {
    if (!excludeFiles.includes(file) && chunkRegex.test(file)) {
      logTitle('💼 Copying dynamic import chunks to', functionPath)
      copySync(join(chunksPath, file), join(functionPath, file), {
        overwrite: false,
        errorOnExist: true,
      })
    }
  })
}

module.exports = copyDynamicImportChunks
