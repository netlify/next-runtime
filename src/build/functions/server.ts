import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { join as posixJoin } from 'node:path/posix'

import { glob } from 'fast-glob'

import {
  copyNextDependencies,
  copyNextServerCode,
  verifyHandlerDirStructure,
  writeTagsManifest,
} from '../content/server.js'
import { PluginContext, SERVER_HANDLER_NAME } from '../plugin-context.js'

/** Copies the runtime dist folder to the lambda */
const copyHandlerDependencies = async (ctx: PluginContext) => {
  const promises: Promise<void>[] = []
  const { included_files: includedFiles = [] } = ctx.netlifyConfig.functions?.['*'] || {}
  // if the user specified some files to include in the lambda
  // we need to copy them to the functions-internal folder
  if (includedFiles.length !== 0) {
    const resolvedFiles = await Promise.all(
      includedFiles.map((globPattern) => glob(globPattern, { cwd: process.cwd() })),
    )
    for (const filePath of resolvedFiles.flat()) {
      promises.push(
        cp(
          join(process.cwd(), filePath),
          // the serverHandlerDir is aware of the dist dir.
          // The distDir must not be the package path therefore we need to rely on the
          // serverHandlerDir instead of the serverHandlerRootDir
          // therefore we need to remove the package path from the filePath
          join(ctx.serverHandlerDir, relative(ctx.packagePath, filePath)),
          {
            recursive: true,
            force: true,
          },
        ),
      )
    }
  }

  const fileList = await glob('dist/**/*', { cwd: ctx.pluginDir })

  for (const filePath of fileList) {
    promises.push(
      cp(join(ctx.pluginDir, filePath), join(ctx.serverHandlerDir, '.netlify', filePath), {
        recursive: true,
        force: true,
      }),
    )
  }
  await Promise.all(promises)
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
      .replaceAll('{{cwd}}', posixJoin(ctx.lambdaWorkingDirectory))
      .replace('{{nextServerHandler}}', posixJoin(ctx.nextServerHandler))
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

  await verifyHandlerDirStructure(ctx)
}
