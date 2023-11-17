import { NetlifyPluginOptions } from '@netlify/build'
import { nodeFileTrace } from '@vercel/nft'
import { cp, rm, writeFile } from 'fs/promises'
import { join, relative, resolve } from 'node:path'
import {
  PLUGIN_DIR,
  PLUGIN_NAME,
  PLUGIN_VERSION,
  SERVER_HANDLER_DIR,
  SERVER_HANDLER_NAME,
} from '../constants.js'
import { copyServerContent, copyServerDependencies } from '../content/server.js'

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
    // base in this case is the directory where it should stop looking up.
    // by setting this to `/` we get absolute paths and don't have to worry about wrongly chaining it
    {
      base: '/',
      ignore: ['**/node_modules/next/**'],
    },
  )

  // copy the handler dependencies
  await Promise.all(
    [...fileList].map(async (path) => {
      // we have to use a fake cwd that points to the actual repository root. On the deployed version this will be the build directory
      // As in the integration tests the node_modules are not located in the tmp directory
      const cwd = process.env.NETLIFY_FAKE_TEST_CWD || process.cwd()
      const absPath = `/${path}`
      // if the file that got traced is inside the plugin directory resolve it with the plugin directory
      // if it is a node_module resolve it with the process working directory.
      const relPath = relative(path.includes(PLUGIN_NAME) ? PLUGIN_DIR : cwd, absPath)
      await cp(absPath, resolve(SERVER_HANDLER_DIR, relPath), {
        recursive: true,
      })
    }),
  )

  // copy the next.js standalone build output to the handler directory
  await copyServerContent(
    resolve(PUBLISH_DIR, 'standalone/.next'),
    resolve(SERVER_HANDLER_DIR, '.next'),
  )
  await copyServerDependencies(
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
