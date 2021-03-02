const { join, relative } = require('path')
const { copySync } = require('fs-extra')
const { logTitle, logItem } = require('../../helpers/logger')
const { NEXT_DIST_DIR } = require('../../config')
const i18n = require('../../helpers/getI18n')()
const setupStaticFileForPage = require('../../helpers/setupStaticFileForPage')
const pages = require('./pages')

// Identify all pages that have been pre-rendered and copy each one to the
// Netlify publish directory.
const setup = (publishPath) => {
  logTitle('🔥 Copying pre-rendered pages without props to', publishPath)

  // Copy each page to the Netlify publish directory
  pages.forEach(({ filePath }) => {
    logItem(filePath)

    // HACK: If i18n, 404.html needs to be at the top level of the publish directory
    if (i18n.defaultLocale && filePath === `pages/${i18n.defaultLocale}/404.html`) {
      copySync(join(NEXT_DIST_DIR, 'serverless', filePath), join(publishPath, '404.html'))
    }

    // The path to the file, relative to the pages directory
    const relativePath = relative('pages', filePath)
    setupStaticFileForPage({ inputPath: relativePath, publishPath })
  })
}

module.exports = setup
