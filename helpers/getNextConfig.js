'use strict'

const { resolve } = require('path')

const moize = require('moize')

// Load next.config.js
const getNextConfig = async function (failBuild = defaultFailBuild) {
  // We cannot load `next` at the top-level because we validate whether the
  // site is using `next` inside `onPreBuild`.
  const { PHASE_PRODUCTION_BUILD } = require('next/constants')
  const loadConfig = require('next/dist/next-server/server/config').default

  try {
    return await loadConfig(PHASE_PRODUCTION_BUILD, resolve('.'))
  } catch (error) {
    return failBuild('Error loading your next.config.js.', { error })
  }
}

const moizedGetNextConfig = moize(getNextConfig, { maxSize: 1e3, isPromise: true })

const defaultFailBuild = function (message, { error }) {
  throw new Error(`${message}\n${error.stack}`)
}

module.exports = moizedGetNextConfig
