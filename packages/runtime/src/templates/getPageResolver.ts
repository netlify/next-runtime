import { dirname, join, resolve } from 'path'

import { readJSON } from 'fs-extra'
import globby from 'globby'
import { outdent } from 'outdent'
import { relative, resolve as resolvePosix } from 'pathe'
import slash from 'slash'

import { HANDLER_FUNCTION_NAME } from '../constants'
import { getDependenciesOfFile } from '../helpers/files'

// Generate a file full of require.resolve() calls for all the pages in the
// build. This is used by the nft bundler to find all the pages.

export const getPageResolver = async ({ publish, target }: { publish: string; target: string }) => {
  const functionDir = resolve(join('.netlify', 'functions', HANDLER_FUNCTION_NAME))
  const root = resolve(slash(publish), target === 'server' ? 'server' : 'serverless')
  const pages = await globby('{pages,app}/**/*.js.nft.json', {
    cwd: root,
    dot: true,
  })

  const dependencies = await Promise.all(
    pages.map(async (page) => {
      const dir = dirname(page)
      const { files } = await readJSON(join(root, page))
      return files?.map((file) => resolve(root, dir, file))
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

/**
 * API routes only need the dependencies for a single entrypoint, so we use the
 * NFT trace file to get the dependencies.
 */
export const getSinglePageResolver = async ({
  functionsDir,
  sourceFile,
}: {
  functionsDir: string
  sourceFile: string
}) => {
  const dependencies = await getDependenciesOfFile(sourceFile)
  // We don't need the actual name, just the relative path.
  const functionDir = resolvePosix(functionsDir, 'functionName')

  const pageFiles = [sourceFile, ...dependencies]
    .map((file) => `require.resolve('${relative(functionDir, file)}')`)
    .sort()

  return outdent/* javascript */ `
    // This file is purely to allow nft to know about these pages. 
      try {
          ${pageFiles.join('\n        ')}
      } catch {}
  `
}
