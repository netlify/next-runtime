import { cp, mkdir, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'node:path'

import { glob } from 'fast-glob'

import { copyNextDependencies, copyNextServerCode, writeTagsManifest } from '../content/server.js'
import { PluginContext, SERVER_HANDLER_NAME } from '../plugin-context.js'

const copyHandlerDependencies = async (ctx: PluginContext) => {
  const fileList = await glob('dist/**/*', { cwd: ctx.pluginDir })
  await Promise.all(
    [...fileList].map((path) =>
      cp(join(ctx.pluginDir, path), join(ctx.serverHandlerDir, path), {
        recursive: true,
        force: true,
      }),
    ),
  )
}

const writeHandlerManifest = async (ctx: PluginContext) => {
  await writeFile(
    join(ctx.serverHandlerRootDir, `${SERVER_HANDLER_NAME}.json`),
    JSON.stringify({
      config: {
        name: 'Next.js Server Handler',
        generator: `${ctx.pluginName}@${ctx.pluginVersion}`,
        nodeBundler: 'none',
        // the folders can vary in monorepos based on the folder structure of the user so we have to glob all
        includedFiles: ['**'],
        includedFilesBasePath: ctx.serverHandlerRootDir,
      },
      version: 1,
    }),
    'utf-8',
  )
}

const writePackageMetadata = async (ctx: PluginContext) => {
  await writeFile(
    join(ctx.serverHandlerRootDir, 'package.json'),
    JSON.stringify({ type: 'module' }),
  )
}

/** Get's the content of the handler file that will be written to the lambda */
const getHandlerFile = async (ctx: PluginContext): Promise<string> => {
  const templatesDir = join(ctx.pluginDir, 'dist/build/templates')

  // In this case it is a monorepo and we need to use a own template for it
  // as we have to change the process working directory
  if (ctx.packagePath.length !== 0) {
    const template = await readFile(join(templatesDir, 'handler-monorepo.tmpl.js'), 'utf-8')

    return template
      .replaceAll('{{cwd}}', join('/var/task', ctx.packagePath))
      .replace('{{nextServerHandler}}', ctx.nextServerHandler)
  }

  return await readFile(join(templatesDir, 'handler.tmpl.js'), 'utf-8')
}

const writeHandlerFile = async (ctx: PluginContext) => {
  const handler = await getHandlerFile(ctx)
  await writeFile(join(ctx.serverHandlerRootDir, `${SERVER_HANDLER_NAME}.mjs`), handler)
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
