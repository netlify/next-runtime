const { normalize } = require('path')
const debounceFn = require('debounce-fn')
const chokidar = require('chokidar')
const execa = require('execa')

const { logTitle } = require('./lib/helpers/logger')

const prepareFolders = require('./lib/steps/prepareFolders')
const copyPublicFiles = require('./lib/steps/copyPublicFiles')
const copyNextAssets = require('./lib/steps/copyNextAssets')
const setupPages = require('./lib/steps/setupPages')
const setupImageFunction = require('./lib/steps/setupImageFunction')
const setupRedirects = require('./lib/steps/setupRedirects')
const setupHeaders = require('./lib/steps/setupHeaders')
const { NETLIFY_PUBLISH_PATH, NETLIFY_FUNCTIONS_PATH, SRC_FILES } = require('./lib/config')

const build = async (functionsPath, publishPath) => {
  const trackNextOnNetlifyFiles = prepareFolders({
    functionsPath,
    publishPath,
  })

  copyPublicFiles(publishPath)

  await copyNextAssets(publishPath)

  await setupPages({ functionsPath, publishPath })

  setupImageFunction(functionsPath)

  await setupRedirects(publishPath)

  setupHeaders(publishPath)

  trackNextOnNetlifyFiles()

  logTitle('✅ Success! All done!')
}

const watch = (functionsPath, publishPath) => {
  logTitle(`👀 Watching source code for changes`)

  const runBuild = debounceFn(
    async () => {
      try {
        execa.sync('next', ['build'], { stdio: 'inherit' })
        await build(functionsPath, publishPath)
      } catch (e) {
        console.log(e)
      }
    },
    {
      wait: 3000,
    },
  )

  chokidar.watch(SRC_FILES).on('all', runBuild)
}

/** options param:
 * {
 *   functionsDir: string to path
 *   publishDir: string to path
 *   watch: { directory: string to path }
 * }
 */

const nextOnNetlify = async (options = {}) => {
  const functionsPath = normalize(options.functionsDir || NETLIFY_FUNCTIONS_PATH)
  const publishPath = normalize(options.publishDir || NETLIFY_PUBLISH_PATH)

  if (options.watch) {
    watch(functionsPath, publishPath)
  } else {
    await build(functionsPath, publishPath)
  }
}

module.exports = nextOnNetlify
