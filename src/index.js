const { normalize } = require('path')

const chokidar = require('chokidar')
const debounceFn = require('debounce-fn')
const execa = require('execa')

const getNextConfig = require('../helpers/getNextConfig')

const { NETLIFY_PUBLISH_PATH, NETLIFY_FUNCTIONS_PATH, SRC_FILES } = require('./lib/config')
const { logTitle } = require('./lib/helpers/logger')
const copyNextAssets = require('./lib/steps/copyNextAssets')
const copyPublicFiles = require('./lib/steps/copyPublicFiles')
const prepareFolders = require('./lib/steps/prepareFolders')
const setupHeaders = require('./lib/steps/setupHeaders')
const setupImageFunction = require('./lib/steps/setupImageFunction')
const setupPages = require('./lib/steps/setupPages')
const setupRedirects = require('./lib/steps/setupRedirects')

const build = async (functionsPath, publishPath, nextRoot) => {
  const trackNextOnNetlifyFiles = prepareFolders({
    functionsPath,
    publishPath,
  })

  // If we're in a monorepo we need to move into the Next site root
  const oldCwd = process.cwd()
  if (nextRoot !== oldCwd) {
    process.chdir(nextRoot)
  }
  copyPublicFiles(publishPath)

  await copyNextAssets(publishPath)

  await setupPages({ functionsPath, publishPath })

  const { images } = await getNextConfig()

  await setupImageFunction(functionsPath, images)

  await setupRedirects(publishPath)

  setupHeaders(publishPath)

  // ...and move back after
  if (nextRoot !== oldCwd) {
    process.chdir(oldCwd)
  }

  trackNextOnNetlifyFiles()

  logTitle('✅ Success! All done!')
}

const watch = (functionsPath, publishPath, nextRoot) => {
  logTitle(`👀 Watching source code for changes`)

  const runBuild = debounceFn(
    async () => {
      try {
        execa.sync('next', ['build'], { stdio: 'inherit', preferLocal: true, cwd: nextRoot })
        await build(functionsPath, publishPath, nextRoot)
      } catch (error) {
        console.log(error)
      }
    },
    {
      wait: 3000,
    },
  )

  chokidar.watch(SRC_FILES).on('all', runBuild)
}

// options param:
// {
//   functionsDir: string to path
//   publishDir: string to path
//   watch: { directory: string to path }
// }
//

const nextOnNetlify = async (options = {}) => {
  const functionsPath = normalize(options.functionsDir || NETLIFY_FUNCTIONS_PATH)
  const publishPath = normalize(options.publishDir || NETLIFY_PUBLISH_PATH)
  const nextRoot = normalize(options.nextRoot || process.cwd())

  if (options.watch) {
    watch(functionsPath, publishPath, nextRoot)
  } else {
    await build(functionsPath, publishPath, nextRoot)
  }
}

module.exports = nextOnNetlify
