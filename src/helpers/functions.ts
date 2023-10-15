import { writeFile } from 'fs/promises'

import { nodeFileTrace } from '@vercel/nft'
import { copy, emptyDir, ensureDir, readJson, writeJSON } from 'fs-extra/esm'

import { BUILD_DIR, SERVER_HANDLER_DIR, SERVER_HANDLER_NAME, PLUGIN_DIR } from './constants.js'

const pkg = await readJson(`${PLUGIN_DIR}/package.json`)

/**
 * Create a Netlify function to run the Next.js server
 */
export const createServerHandler = async () => {
  // reset the handler directory
  await emptyDir(SERVER_HANDLER_DIR)
  await ensureDir(`${SERVER_HANDLER_DIR}/node_modules`)

  // trace the handler dependencies
  const { fileList } = await nodeFileTrace(
    [`${PLUGIN_DIR}/dist/handlers/server.js`, `${PLUGIN_DIR}/dist/handlers/cache.cjs`],
    { base: PLUGIN_DIR, ignore: ['package.json', 'node_modules/next/**'] },
  )

  await Promise.all(
    // copy the handler dependencies
    [...fileList].map((path) => copy(`${PLUGIN_DIR}/${path}`, `${SERVER_HANDLER_DIR}/${path}`)),
  )

  // copy the next.js standalone build output to the handler directory
  await copy(`${BUILD_DIR}/standalone/.next`, `${SERVER_HANDLER_DIR}/.next`)
  await copy(`${BUILD_DIR}/standalone/node_modules`, `${SERVER_HANDLER_DIR}/node_modules`)

  // create the handler metadata file
  await writeJSON(`${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}.json`, {
    config: {
      name: 'Next.js Server Handler',
      generator: `${pkg.name}@${pkg.version}`,
      nodeBundler: 'none',
      includedFiles: [
        `${SERVER_HANDLER_NAME}*`,
        'package.json',
        'dist/**',
        '.next/**',
        'node_modules/**',
      ],
      includedFilesBasePath: SERVER_HANDLER_DIR,
    },
    version: 1,
  })

  // configure ESM
  await writeFile(`${SERVER_HANDLER_DIR}/package.json`, JSON.stringify({ type: 'module' }))

  // write the root handler file
  await writeFile(
    `${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}.js`,
    `import handler from './dist/handlers/server.js';export default handler;export const config = {path:'/*'}`,
  )
}