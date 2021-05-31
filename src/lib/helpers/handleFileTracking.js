const { join } = require('path')

const findCacheDir = require('find-cache-dir')
const { existsSync, readdirSync, readFileSync, removeSync, writeFileSync } = require('fs-extra')

const { NETLIFY_PUBLISH_PATH, NETLIFY_FUNCTIONS_PATH } = require('../config')

const TRACKING_FILE_SEPARATOR = '---'
const getDifference = (before, after) => after.filter((filePath) => !before.includes(filePath))

// Clean configured publish and functions folders and track next-on-netlify files
// for future cleans
const handleFileTracking = ({ functionsPath, publishPath }) => {
  const isConfiguredFunctionsDir = functionsPath !== NETLIFY_FUNCTIONS_PATH
  const isConfiguredPublishDir = publishPath !== NETLIFY_PUBLISH_PATH

  const cacheDir = findCacheDir({ name: 'next-on-netlify', create: true })
  if (!cacheDir) return () => {}
  const trackingFilePath = join(cacheDir, '.nonfiletracking')

  if (existsSync(trackingFilePath)) {
    const trackingFile = readFileSync(trackingFilePath, 'utf8')
    const [trackedFunctions, trackedPublish] = trackingFile.split(TRACKING_FILE_SEPARATOR)
    const cleanConfiguredFiles = (trackedFiles, dirPath) => {
      trackedFiles
        .map((file) => file.trim())
        .filter(Boolean)
        .forEach((file) => {
          const filePath = join(dirPath, file)
          removeSync(filePath)
        })
    }

    if (isConfiguredPublishDir) {
      cleanConfiguredFiles(trackedPublish.split('\n'), publishPath)
    }
    if (isConfiguredFunctionsDir) {
      cleanConfiguredFiles(trackedFunctions.split('\n'), functionsPath)
    }
  }

  const functionsBeforeRun = existsSync(functionsPath) ? readdirSync(functionsPath) : []
  const publishBeforeRun = existsSync(publishPath) ? readdirSync(publishPath) : []

  // this callback will run at the end of nextOnNetlify()
  const trackNewFiles = () => {
    const functionsAfterRun =
      isConfiguredFunctionsDir && existsSync(functionsPath) ? readdirSync(functionsPath) : functionsBeforeRun
    const publishAfterRun =
      isConfiguredPublishDir && existsSync(publishPath) ? readdirSync(publishPath) : publishBeforeRun
    const newFunctionsFiles = getDifference(functionsBeforeRun, functionsAfterRun)
    const newPublishFiles = getDifference(publishBeforeRun, publishAfterRun)

    const allTrackedFiles = [...newFunctionsFiles, TRACKING_FILE_SEPARATOR, ...newPublishFiles]
    writeFileSync(trackingFilePath, allTrackedFiles.join('\n'))
  }

  return trackNewFiles
}

module.exports = handleFileTracking
