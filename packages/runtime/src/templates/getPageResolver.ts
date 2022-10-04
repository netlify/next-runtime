import { dirname, join, resolve } from 'path'

import { readJSON } from 'fs-extra'
import { outdent } from 'outdent'
import { relative } from 'pathe'
import slash from 'slash'
import glob from 'tiny-glob'

import { HANDLER_FUNCTION_NAME } from '../constants'

// Generate a file full of require.resolve() calls for all the pages in the
// build. This is used by the nft bundler to find all the pages.

export const getPageResolver = async ({ publish, target }: { publish: string; target: string }) => {
  const functionDir = resolve(join('.netlify', 'functions', HANDLER_FUNCTION_NAME))
  const root = resolve(slash(publish), target === 'server' ? 'server' : 'serverless')
  const pages = await glob('{pages,app}/**/*.js.nft.json', {
    cwd: root,
    dot: true,
  })

  const dependencies = await Promise.all(
    pages.map(async (page) => {
      const dir = dirname(page)
      const { files } = await readJSON(join(root, page))
      return files.map((file) => resolve(root, dir, file))
    }),
  )

  const deduped = [...new Set(dependencies.flat())]

  const pageFiles = deduped.map((file) => `require.resolve('${relative(functionDir, file)}')`).sort()

  return outdent`
    // This file is purely to allow nft to know about these pages.
    exports.resolvePages = () => {
        try {
            ${pageFiles.join('\n        ')}
        } catch {}
    }
  `
}
