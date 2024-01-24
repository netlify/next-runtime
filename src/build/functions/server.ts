import { cp, mkdir, rm, writeFile } from 'fs/promises'
import { join } from 'node:path'

import { glob } from 'fast-glob'

import { copyNextDependencies, copyNextServerCode, writeTagsManifest } from '../content/server.js'
import { PluginContext, SERVER_HANDLER_NAME } from '../plugin-context.js'

const copyHandlerDependencies = async (ctx: PluginContext) => {
  const fileList = await glob('dist/**/*', { cwd: ctx.pluginDir })
  await Promise.all(
    [...fileList].map((path) =>
      cp(join(ctx.pluginDir, path), join(ctx.serverHandlerDir, path), { recursive: true }),
    ),
  )
}

const writeHandlerManifest = async (ctx: PluginContext) => {
  await writeFile(
    join(ctx.serverHandlerDir, `${SERVER_HANDLER_NAME}.json`),
    JSON.stringify({
      config: {
        name: 'Next.js Server Handler',
        generator: `${ctx.pluginName}@${ctx.pluginVersion}`,
        nodeBundler: 'none',
        includedFiles: ['**'],
        includedFilesBasePath: ctx.serverHandlerDir,
      },
      version: 1,
    }),
    'utf-8',
  )
}

const writePackageMetadata = async (ctx: PluginContext) => {
  await writeFile(join(ctx.serverHandlerDir, 'package.json'), JSON.stringify({ type: 'module' }))
}

const writeHandlerFile = async (ctx: PluginContext) => {
  await writeFile(
    join(ctx.serverHandlerDir, `${SERVER_HANDLER_NAME}.js`),
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
export const createServerHandler = async (ctx: PluginContext) => {
  await rm(ctx.serverFunctionsDir, { recursive: true, force: true })
  await mkdir(join(ctx.serverHandlerDir, '.netlify'), { recursive: true })

  await Promise.all([
    copyNextServerCode(ctx),
    copyNextDependencies(ctx),
    writeTagsManifest(ctx),
    copyHandlerDependencies(ctx),
    writeHandlerManifest(ctx),
    writePackageMetadata(ctx),
    writeHandlerFile(ctx),
  ])
}
