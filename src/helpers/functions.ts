import { writeFileSync } from 'fs'

import { NetlifyConfig } from '@netlify/build'
import { nodeFileTrace } from '@vercel/nft'
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
  await copyServerHandlerDependencies(pluginDir)
  copyNextJsDependencies(publishDir)
  writeServerHandlerFiles(pluginPkg)

  config.redirects ||= []
  config.redirects.push({ from: `/*`, to: SERVER_HANDLER_URL, status: 200 })
}

const copyServerHandlerDependencies = async (pluginDir: string) => {
  const { fileList } = await nodeFileTrace([`${pluginDir}/dist/templates/server-handler.js`], {
    base: pluginDir,
    ignore: ['package.json'],
  })

  fileList.forEach((path) => {
    copySync(`${pluginDir}/${path}`, `${SERVER_HANDLER_DIR}/${path}`)
  })
}

const copyNextJsDependencies = (publishDir: string) => {
  copySync(`${publishDir}/standalone/.next`, `${SERVER_HANDLER_DIR}/.next`)
  copySync(`${publishDir}/standalone/node_modules`, `${SERVER_HANDLER_DIR}/node_modules`)
}

const writeServerHandlerFiles = (pluginPkg: { name: string; version: string }) => {
  const metadata = {
    config: {
      name: 'Next.js Server Handler',
      generator: `${pluginPkg.name}@${pluginPkg.version}`,
      nodeBundler: 'none',
      includedFiles: [`${SERVER_HANDLER_NAME}.*`, `dist/**`, `.next/**`, `node_modules/**`, `package.json`],
      includedFilesBasePath: SERVER_HANDLER_DIR,
    },
    version: 1,
  }

  writeJSONSync(`${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}.json`, metadata)
  writeJSONSync(`${SERVER_HANDLER_DIR}/package.json`, { type: 'module' })
  writeFileSync(
    `${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}.js`,
    `export { handler } from './dist/templates/server-handler.js'`,
  )
}

export const createCacheHandler = () => {
  copySync(`${__dirname}/../templates/cache-handler.cjs`, `${NETLIFY_TEMP_DIR}/cache-handler.js`)
}
