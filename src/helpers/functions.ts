import { writeFileSync } from 'fs'

import { NetlifyConfig } from '@netlify/build'
import { nodeFileTrace } from '@vercel/nft'
import { build } from 'esbuild'
import { copySync, emptyDirSync, readJsonSync, writeJSONSync } from 'fs-extra/esm'

import {
  NETLIFY_TEMP_DIR,
  SERVER_HANDLER_DIR,
  SERVER_HANDLER_NAME,
  SERVER_HANDLER_URL,
  __dirname,
} from './constants.js'

/**
 * Create a Netlify function to run the Next.js server
 * @param publishDir The publish directory
 * @param config Netlify config
 */
export const createServerHandler = async (publishDir: string, config: NetlifyConfig) => {
  const pluginDir = `${__dirname}../..`
  const pluginPkg = readJsonSync(`${pluginDir}/package.json`)

  emptyDirSync(SERVER_HANDLER_DIR)
  copyNextJsDependencies(publishDir)
  await writeServerHandlerFiles(pluginDir, pluginPkg)

  config.redirects ||= []
  config.redirects.push({ from: `/*`, to: SERVER_HANDLER_URL, status: 200 })
}

const copyNextJsDependencies = (publishDir: string) => {
  copySync(`${publishDir}/standalone/.next`, `${SERVER_HANDLER_DIR}/.next`)
  copySync(`${publishDir}/standalone/node_modules`, `${SERVER_HANDLER_DIR}/node_modules`)
}

const writeServerHandlerFiles = async (pluginDir: string, pluginPkg: { name: string; version: string }) => {
  const metadata = {
    config: {
      name: 'Next.js Server Handler',
      generator: `${pluginPkg.name}@${pluginPkg.version}`,
      nodeBundler: 'none', // we take care of bundling on our own
      includedFiles: ['.next/**', 'node_modules/**', `${SERVER_HANDLER_NAME}-actual.mjs`], // these are the bad boys we have to copy over earlier otherwise they don't end up in the bundle
      includedFilesBasePath: SERVER_HANDLER_DIR,
    },
    version: 1,
  }

  await build({
    entryPoints: [`${pluginDir}/dist/templates/server-handler.mjs`],
    bundle: true,
    platform: 'node',
    target: ['node18'],
    format: 'esm',
    external: ['next'],
    outfile: `${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}-actual.mjs`,
  })
  // the metadata on how a function should look like
  writeJSONSync(`${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}.json`, metadata)
  writeFileSync(
    `${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}.mjs`,
    `import handler from './${SERVER_HANDLER_NAME}-actual.mjs';export default (request) => handler(request);`,
  )
}

export const createCacheHandler = () => {
  copySync(`${__dirname}/../templates/cache-handler.cjs`, `${NETLIFY_TEMP_DIR}/cache-handler.js`)
}
