import { nodeFileTrace } from '@vercel/nft'
import { writeFile, rm, mkdir, cp } from 'fs/promises'
import { BUILD_DIR, PLUGIN_DIR, SERVER_HANDLER_DIR, SERVER_HANDLER_NAME } from '../constants.js'
import { copyServerContent } from '../content/server.js'
import { join } from 'node:path'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync(join(PLUGIN_DIR, 'package.json'), 'utf-8'))

/**
 * Create a Netlify function to run the Next.js server
 */
export const createServerHandler = async () => {
  // reset the handler directory
  await rm(join(process.cwd(), SERVER_HANDLER_DIR), { force: true, recursive: true })
  await mkdir(join(process.cwd(), SERVER_HANDLER_DIR), { recursive: true })

  // trace the handler dependencies
  const { fileList } = await nodeFileTrace(
    [
      join(PLUGIN_DIR, 'dist/run/handlers/server.js'),
      join(PLUGIN_DIR, 'dist/run/handlers/cache.cjs'),
    ],
    { base: PLUGIN_DIR, ignore: ['package.json', 'node_modules/next/**'] },
  )

  // copy the handler dependencies
  await Promise.all(
    [...fileList].map((path) =>
      cp(join(PLUGIN_DIR, path), join(process.cwd(), SERVER_HANDLER_DIR, path), {
        recursive: true,
      }),
    ),
  )

  // copy the next.js standalone build output to the handler directory
  await copyServerContent(
    join(process.cwd(), BUILD_DIR, '.next/standalone/.next'),
    join(process.cwd(), SERVER_HANDLER_DIR, '.next'),
  )
  await cp(
    join(process.cwd(), BUILD_DIR, '.next/standalone/node_modules'),
    join(process.cwd(), SERVER_HANDLER_DIR, 'node_modules'),
    { recursive: true },
  )

  // create the handler metadata file
  await writeFile(
    join(process.cwd(), SERVER_HANDLER_DIR, `${SERVER_HANDLER_NAME}.json`),
    JSON.stringify({
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
        includedFilesBasePath: join(process.cwd(), SERVER_HANDLER_DIR),
      },
      version: 1,
    }),
    'utf-8',
  )

  // configure ESM
  await writeFile(
    join(process.cwd(), SERVER_HANDLER_DIR, 'package.json'),
    JSON.stringify({ type: 'module' }),
  )

  // write the root handler file
  await writeFile(
    join(process.cwd(), SERVER_HANDLER_DIR, `${SERVER_HANDLER_NAME}.js`),
    `import handler from './dist/run/handlers/server.js';export default handler;export const config = {path:'/*'}`,
  )
}
