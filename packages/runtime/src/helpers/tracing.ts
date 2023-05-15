import { existsSync, readJSON, writeJSON } from 'fs-extra'
import { dirname, join, resolve } from 'pathe'
import glob from 'tiny-glob'

import type { NFTFile, RequiredServerFiles } from './config'

/**
 * Reads the node file trace file for a given file, and resolves the dependencies
 */
export const getDependenciesOfFile = async (file: string) => {
  const nft = `${file}.nft.json`
  if (!existsSync(nft)) {
    return []
  }
  const dependencies = (await readJSON(nft, 'utf8')) as NFTFile
  return dependencies.files.map((dep) => resolve(dirname(file), dep))
}

/**
 * Returns all of the NextJS configuration stored within 'required-server-files.json'
 * To update the configuration within this file, use the 'updateRequiredServerFiles' method.
 */
export const getRequiredServerFiles = async (publish: string): Promise<RequiredServerFiles> => {
  const configFile = join(publish, 'required-server-files.json')
  return await readJSON(configFile)
}

/**
 * Writes a modified configuration object to 'required-server-files.json'.
 * To get the full configuration, use the 'getRequiredServerFiles' method.
 */
export const updateRequiredServerFiles = async (publish: string, modifiedConfig: RequiredServerFiles) => {
  const configFile = join(publish, 'required-server-files.json')
  await writeJSON(configFile, modifiedConfig)
}

const traceRequiredServerFiles = async (publish: string): Promise<string[]> => {
  const {
    files,
    relativeAppDir,
    config: {
      experimental: { outputFileTracingRoot },
    },
  } = await getRequiredServerFiles(publish)
  const appDirRoot = join(outputFileTracingRoot, relativeAppDir)
  const absoluteFiles = files.map((file) => join(appDirRoot, file))

  absoluteFiles.push(join(publish, 'required-server-files.json'))

  return absoluteFiles
}

const traceNextServer = async (publish: string): Promise<string[]> => {
  const nextServerDeps = await getDependenciesOfFile(join(publish, 'next-server.js'))

  // during testing, i've seen `next-server` contain only one line.
  // this is a sanity check to make sure we're getting all the deps.
  if (nextServerDeps.length < 10) {
    console.error(nextServerDeps)
    throw new Error("next-server.js.nft.json didn't contain all dependencies.")
  }

  const filtered = nextServerDeps.filter((f) => {
    // NFT detects a bunch of large development files that we don't need.
    if (f.endsWith('.development.js')) return false

    // not needed for API Routes!
    if (f.endsWith('node_modules/sass/sass.dart.js')) return false

    return true
  })

  return filtered
}

export const traceNPMPackage = async (packageName: string, publish: string) => {
  try {
    return await glob(join(dirname(require.resolve(packageName, { paths: [publish] })), '**', '*'), {
      absolute: true,
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'test') {
      return []
    }
    throw error
  }
}

export const getCommonDependencies = async (publish: string) => {
  const deps = await Promise.all([
    traceRequiredServerFiles(publish),
    traceNextServer(publish),

    // used by our own bridge.js
    traceNPMPackage('follow-redirects', publish),

    // used by bridge.js, only for ODB routes - they don't weigh a lot, so we can include them anyway
    traceNPMPackage('@netlify/functions/package.json', publish),
    traceNPMPackage('is-promise', publish),
  ])

  return deps.flat(1)
}
