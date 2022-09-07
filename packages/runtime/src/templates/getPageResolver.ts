import { posix } from 'path'

import { outdent } from 'outdent'
import slash from 'slash'
import glob from 'tiny-glob'

import { HANDLER_FUNCTION_NAME } from '../constants'

// Generate a file full of require.resolve() calls for all the pages in the
// build. This is used by the nft bundler to find all the pages.

export const getPageResolver = async ({ publish, target }: { publish: string; target: string }) => {
  const functionDir = posix.resolve(posix.join('.netlify', 'functions', HANDLER_FUNCTION_NAME))
  const root = posix.resolve(slash(publish), target === 'server' ? 'server' : 'serverless', 'pages')

  const pages = await glob('**/*.js', {
    cwd: root,
    dot: true,
  })
  const pageFiles = pages
    .map((page) => `require.resolve('${posix.relative(functionDir, posix.join(root, slash(page)))}')`)
    .sort()

  return outdent`
    // This file is purely to allow nft to know about these pages. It should be temporary.
    exports.resolvePages = () => {
        try {
            ${pageFiles.join('\n        ')}
        } catch {}
    }
  `
}
