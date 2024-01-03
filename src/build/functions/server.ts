import { type NetlifyPluginOptions } from '@netlify/build'
import { glob } from 'fast-glob'
import { cp, mkdir, rm, writeFile } from 'fs/promises'
import { join, resolve } from 'node:path'
import {
  PLUGIN_DIR,
  PLUGIN_NAME,
  PLUGIN_VERSION,
  SERVER_FUNCTIONS_DIR,
  SERVER_HANDLER_DIR,
  SERVER_HANDLER_NAME,
} from '../constants.js'
import { copyNextDependencies, copyNextServerCode, writeTagsManifest } from '../content/server.js'

const copyHandlerDependencies = async () => {
  const fileList = await glob('dist/**/*', { cwd: PLUGIN_DIR })
  await Promise.all(
    [...fileList].map(async (path) =>
      cp(join(PLUGIN_DIR, path), resolve(SERVER_HANDLER_DIR, path), { recursive: true }),
    ),
  )
}

const writeHandlerManifest = async () => {
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
          '.netlify/**',
          'node_modules/**',
        ],
        includedFilesBasePath: resolve(SERVER_HANDLER_DIR),
      },
      version: 1,
    }),
    'utf-8',
  )
}

const writePackageMetadata = async () => {
  await writeFile(resolve(SERVER_HANDLER_DIR, 'package.json'), JSON.stringify({ type: 'module' }))
}

const writeHandlerFile = async () => {
  await writeFile(
    resolve(SERVER_HANDLER_DIR, `${SERVER_HANDLER_NAME}.js`),
    `
    import handler from './dist/run/handlers/server.js';
    export default handler;
    export const config = {
      path: '/*',
      preferStatic: true
    };
    `,
  )
}

/**
 * Create a Netlify function to run the Next.js server
 */
export const createServerHandler = async ({
  constants,
}: Pick<NetlifyPluginOptions, 'constants'>) => {
  await rm(resolve(SERVER_FUNCTIONS_DIR), { recursive: true, force: true })
  await mkdir(resolve(SERVER_HANDLER_DIR, '.netlify'), { recursive: true })

  await Promise.all([
    copyNextServerCode({ constants }),
    copyNextDependencies({ constants }),
    writeTagsManifest({ constants }),
    copyHandlerDependencies(),
    writeHandlerManifest(),
    writePackageMetadata(),
    writeHandlerFile(),
  ])
}
