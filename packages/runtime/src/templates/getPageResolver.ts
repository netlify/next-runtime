import { posix } from 'path'

import glob from 'globby'
import { outdent } from 'outdent'
import { relative, resolve } from 'pathe'
import slash from 'slash'

import { HANDLER_FUNCTION_NAME } from '../constants'
import { getDependenciesOfFile } from '../helpers/files'

// Generate a file full of require.resolve() calls for all the pages in the
// build. This is used by the nft bundler to find all the pages.

export const getUniqueDependencies = async (sourceFiles: Array<string>) => {
  const dependencies = await Promise.all(sourceFiles.map((sourceFile) => getDependenciesOfFile(sourceFile)))
  return [...new Set([...sourceFiles, ...dependencies.flat()])].sort()
}

export const getAllPageDependencies = async (publish: string) => {
  const root = posix.resolve(slash(publish), 'server')

  const pageFiles = await glob('{pages,app}/**/*.js', {
    cwd: root,
    absolute: true,
    dot: true,
  })

  return getUniqueDependencies(pageFiles)
}

export const getResolverForDependencies = ({
  dependencies,
  functionDir,
}: {
  dependencies: string[]
  functionDir: string
}) => {
  const pageFiles = dependencies.map((file) => `require.resolve('${relative(functionDir, file)}')`)
  return outdent/* javascript */ `
    // This file is purely to allow nft to know about these pages. 
    exports.resolvePages = () => {
        try {
            ${pageFiles.join('\n        ')}
        } catch {}
    }
  `
}

export const getResolverForPages = async (publish: string) => {
  const functionDir = posix.resolve(posix.join('.netlify', 'functions', HANDLER_FUNCTION_NAME))
  const dependencies = await getAllPageDependencies(publish)
  return getResolverForDependencies({ dependencies, functionDir })
}

export const getResolverForSourceFiles = async ({
  functionsDir,
  sourceFiles,
}: {
  functionsDir: string
  sourceFiles: Array<string>
}) => {
  // We don't need the actual name, just the relative path.
  const functionDir = resolve(functionsDir, 'functionName')
  const dependencies = await getUniqueDependencies(sourceFiles)
  return getResolverForDependencies({ dependencies, functionDir })
}
