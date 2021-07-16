const { join } = require('path')

const { copySync, existsSync, readdirSync } = require('fs-extra')

const getNextDistDir = require('./getNextDistDir')
const { logTitle } = require('./logger')

// Check if there are dynamic import chunks and copy to the necessary function dir
const copyDynamicImportChunks = async (functionPath) => {
  const nextDistDir = await getNextDistDir()
  const chunksPathWebpack4 = join(nextDistDir, 'serverless')
  const filesWP4 = readdirSync(chunksPathWebpack4)
  const chunkRegexWP4 = new RegExp(/^(\.?[-$~\w]+)+\.js$/g)
  const excludeFiles = new Set(['init-server.js.js', 'on-error-server.js.js'])
  const copyPathWP4 = join(functionPath, 'nextPage')

  filesWP4.forEach((file) => {
    if (!excludeFiles.has(file) && chunkRegexWP4.test(file)) {
      copySync(join(chunksPathWebpack4, file), join(copyPathWP4, file), {
        overwrite: false,
        errorOnExist: true,
      })
    }
  })

  // Chunks are copied into the nextPage directory, as a sibling to "pages" or "api".
  // This matches the Next output, so that imports work correctly
  const chunksPathWebpack5 = join(nextDistDir, 'serverless', 'chunks')
  const filesWP5 = existsSync(chunksPathWebpack5) ? readdirSync(chunksPathWebpack5) : []
  const copyPathWP5 = join(functionPath, 'nextPage', 'chunks')

  filesWP5.forEach((file) => {
    if (file.endsWith('.js')) {
      copySync(join(chunksPathWebpack5, file), join(copyPathWP5, file))
    }
  })
}

module.exports = copyDynamicImportChunks
