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
  filesWP4.forEach((file) => {
    if (!excludeFiles.has(file) && chunkRegexWP4.test(file)) {
      // WP4 files are looked for one level up (../) in runtime
      // This is a hack to make the file one level up i.e. with
      // nextPage/nextPage/index.js, the chunk is moved to the inner nextPage
      const copyPath = join(functionPath, 'nextPage')
      logTitle('💼 Copying WP4 dynamic import chunks to', copyPath)
      copySync(join(chunksPathWebpack4, file), join(copyPath, file), {
        overwrite: false,
        errorOnExist: true,
      })
    }
  })
  const chunksPathWebpack5 = join(nextDistDir, 'serverless', 'chunks')
  const filesWP5 = existsSync(chunksPathWebpack5) ? readdirSync(chunksPathWebpack5) : []
  filesWP5.forEach((file) => {
    // WP5 files are looked for two levels up (../../chunks) in runtime
    // This is a hack to make the file one level up i.e. with
    // nextPage/nextPage/index.js, the chunk is moved to outer nextPage in a /chunks dir
    const copyPath = join(functionPath, 'chunks')
    logTitle('💼 Copying WB5 dynamic import chunks to', copyPath)
    copySync(join(chunksPathWebpack5, file), join(copyPath, file), {
      overwrite: false,
      errorOnExist: true,
    })
  })
}

module.exports = copyDynamicImportChunks
