const {
  posix: { resolve, join, relative },
} = require('path')

const { outdent } = require('outdent')
const slash = require('slash')
const glob = require('tiny-glob')

const { HANDLER_FUNCTION_NAME } = require('../constants')

// Generate a file full of require.resolve() calls for all the pages in the
// build. This is used by the nft bundler to find all the pages.

exports.getPageResolver = async ({ netlifyConfig, target }) => {
  const functionDir = resolve(join('.netlify', 'functions', HANDLER_FUNCTION_NAME))
  const root = join(netlifyConfig.build.publish, target === 'server' ? 'server' : 'serverless', 'pages')

  const pages = await glob('**/*.js', {
    cwd: root,
    dot: true,
  })
  const pageFiles = pages.map((page) => `require.resolve('${relative(functionDir, join(root, slash(page)))}')`).sort()

  return outdent`
    // This file is purely to allow nft to know about these pages. It should be temporary.
    exports.resolvePages = () => {
        try {
            ${pageFiles.join('\n        ')}
        } catch {}
    }
  `
}
