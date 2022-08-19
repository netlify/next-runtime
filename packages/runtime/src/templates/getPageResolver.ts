import { posix } from 'path'

import { outdent } from 'outdent'
import { relative, resolve } from 'pathe'
import slash from 'slash'
import glob from 'tiny-glob'

import { HANDLER_FUNCTION_NAME } from '../constants'
import { getDependenciesOfFile } from '../helpers/files'

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
  const functionDir = resolve(functionsDir, 'functionName')

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
