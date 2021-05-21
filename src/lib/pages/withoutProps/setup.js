const { join, relative } = require('path')

const { copySync } = require('fs-extra')

const asyncForEach = require('../../helpers/asyncForEach')
const getI18n = require('../../helpers/getI18n')
const getNextDistDir = require('../../helpers/getNextDistDir')
const { logTitle, logItem } = require('../../helpers/logger')

const getPages = require('./pages')

// Identify all pages that have been pre-rendered and copy each one to the
// Netlify publish directory.
const setup = async (publishPath) => {
  logTitle('🔥 Copying pre-rendered pages without props to', publishPath)

  const i18n = await getI18n()
  const nextDistDir = await getNextDistDir()
  const pages = await getPages()

  // Copy each page to the Netlify publish directory
  return pages.map(({ filePath }) => {
    // HACK: If i18n, 404.html needs to be at the top level of the publish directory
    if (i18n.defaultLocale && filePath === `pages/${i18n.defaultLocale}/404.html`) {
      copySync(join(nextDistDir, 'serverless', filePath), join(publishPath, '404.html'))
    }

    // The path to the file, relative to the pages directory
    const relativePath = relative('pages', filePath)
    return { type: 'static', inputPath: relativePath, publishPath }
  })
}

module.exports = setup
