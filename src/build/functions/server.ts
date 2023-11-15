import { NetlifyPluginOptions } from '@netlify/build'
import { nodeFileTrace } from '@vercel/nft'
import { mkdir, rm, symlink, writeFile } from 'fs/promises'
import { dirname, join, resolve } from 'node:path'
import {
  PLUGIN_DIR,
  PLUGIN_NAME,
  PLUGIN_VERSION,
  SERVER_HANDLER_DIR,
  SERVER_HANDLER_NAME,
} from '../constants.js'
import { linkServerContent, linkServerDependencies } from '../content/server.js'

/**
 * Create a Netlify function to run the Next.js server
 */
export const createServerHandler = async ({
  constants: { PUBLISH_DIR },
}: Pick<NetlifyPluginOptions, 'constants'>) => {
  // reset the handler directory
  await rm(resolve(SERVER_HANDLER_DIR), { recursive: true, force: true })

  // trace the handler dependencies
  const { fileList } = await nodeFileTrace(
    [
      join(PLUGIN_DIR, 'dist/run/handlers/server.js'),
      join(PLUGIN_DIR, 'dist/run/handlers/cache.cjs'),
      join(PLUGIN_DIR, 'dist/run/handlers/next.cjs'),
    ],
    { base: PLUGIN_DIR, ignore: ['package.json', 'node_modules/next/**'] },
  )

  // copy the handler dependencies
  await Promise.all(
    [...fileList].map(async (path) => {
      await mkdir(resolve(SERVER_HANDLER_DIR, dirname(path)), { recursive: true })
      await symlink(resolve(PLUGIN_DIR, path), resolve(SERVER_HANDLER_DIR, path))
    }),
  )

  // copy the next.js standalone build output to the handler directory
  await linkServerContent(
    resolve(PUBLISH_DIR, 'standalone/.next'),
    resolve(SERVER_HANDLER_DIR, '.next'),
  )
  await linkServerDependencies(
    resolve(PUBLISH_DIR, 'standalone/node_modules'),
    resolve(SERVER_HANDLER_DIR, 'node_modules'),
  )

  // create the handler metadata file
  await writeFile(
    resolve(SERVER_HANDLER_DIR, `${SERVER_HANDLER_NAME}.json`),
    JSON.stringify({
      config: {
        name: 'Next.js Server Handler',
        generator: `${PLUGIN_NAME}@${PLUGIN_VERSION}`,
        nodeBundler: 'none',
        includedFiles: [
          `${SERVER_HANDLER_NAME}*`,
          'package.json',
          'dist/**',
          '.next/**',
          'node_modules/**',
        ],
        includedFilesBasePath: resolve(SERVER_HANDLER_DIR),
      },
      version: 1,
    }),
    'utf-8',
  )

  // configure ESM
  await writeFile(resolve(SERVER_HANDLER_DIR, 'package.json'), JSON.stringify({ type: 'module' }))

  // write the root handler file
  await writeFile(
    resolve(SERVER_HANDLER_DIR, `${SERVER_HANDLER_NAME}.js`),
    `import handler from './dist/run/handlers/server.js';export default handler`,
  )
}
