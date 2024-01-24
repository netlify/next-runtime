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
const getHandlerFile = (ctx: PluginContext): string => {
  const config = `
export const config = {
  path: '/*',
  preferStatic: true,
}`

  // In this case it is a monorepo and we need to change the process working directory
  if (ctx.packagePath.length !== 0) {
    return `process.chdir('${join('/var/task', ctx.packagePath)}');

let cachedHandler;
export default async function(...args) {
  if (!cachedHandler) {
    const { default: handler } = await import('./${ctx.nextServerHandler}');
    cachedHandler = handler;
  }
  return cachedHandler(...args)
};

${config}`
  }

  // in non monorepo scenarios we don't have to change the process working directory
  return `import handler from './dist/run/handlers/server.js';
export default handler;
${config}`
}

const writeHandlerFile = async (ctx: PluginContext) => {
  await writeFile(join(ctx.serverHandlerRootDir, `${SERVER_HANDLER_NAME}.mjs`), getHandlerFile(ctx))
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
