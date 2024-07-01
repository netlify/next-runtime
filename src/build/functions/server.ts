import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, parse as parsePath, relative } from 'node:path'
import { join as posixJoin } from 'node:path/posix'

import { trace } from '@opentelemetry/api'
import { wrapTracer } from '@opentelemetry/api/experimental'
import { glob } from 'fast-glob'

import {
  copyNextDependencies,
  copyNextServerCode,
  verifyHandlerDirStructure,
} from '../content/server.js'
import { PluginContext, SERVER_HANDLER_NAME } from '../plugin-context.js'

const tracer = wrapTracer(trace.getTracer('Next runtime'))

/** Copies the runtime dist folder to the lambda */
const copyHandlerDependencies = async (ctx: PluginContext) => {
  await tracer.withActiveSpan('copyHandlerDependencies', async (span) => {
    const promises: Promise<void>[] = []
    // if the user specified some files to include in the lambda
    // we need to copy them to the functions-internal folder
    const { included_files: includedFiles = [] } = ctx.netlifyConfig.functions?.['*'] || {}

    // we also force including the .env files to ensure those are available in the lambda
    includedFiles.push(
      posixJoin(ctx.relativeAppDir, '.env'),
      posixJoin(ctx.relativeAppDir, '.env.production'),
      posixJoin(ctx.relativeAppDir, '.env.local'),
      posixJoin(ctx.relativeAppDir, '.env.production.local'),
    )

    span.setAttribute('next.includedFiles', includedFiles.join(','))

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
          join(ctx.serverHandlerDir, relative(ctx.relativeAppDir, filePath)),
          {
            recursive: true,
            force: true,
          },
        ),
      )
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
  })
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

const applyTemplateVariables = (template: string, variables: Record<string, string>) => {
  return Object.entries(variables).reduce((acc, [key, value]) => {
    return acc.replaceAll(key, value)
  }, template)
}

/** Get's the content of the handler file that will be written to the lambda */
const getHandlerFile = async (ctx: PluginContext): Promise<string> => {
  const templatesDir = join(ctx.pluginDir, 'dist/build/templates')

  const templateVariables: Record<string, string> = {
    '{{useRegionalBlobs}}': ctx.useRegionalBlobs.toString(),
  }
  // In this case it is a monorepo and we need to use a own template for it
  // as we have to change the process working directory
  if (ctx.relativeAppDir.length !== 0) {
    const template = await readFile(join(templatesDir, 'handler-monorepo.tmpl.js'), 'utf-8')

    templateVariables['{{cwd}}'] = posixJoin(ctx.lambdaWorkingDirectory)
    templateVariables['{{nextServerHandler}}'] = posixJoin(ctx.nextServerHandler)

    return applyTemplateVariables(template, templateVariables)
  }

  return applyTemplateVariables(
    await readFile(join(templatesDir, 'handler.tmpl.js'), 'utf-8'),
    templateVariables,
  )
}

const writeHandlerFile = async (ctx: PluginContext) => {
  const handler = await getHandlerFile(ctx)
  await writeFile(join(ctx.serverHandlerRootDir, `${SERVER_HANDLER_NAME}.mjs`), handler)
}

const clearStaleServerHandlers = async (ctx: PluginContext) => {
  const potentialServerlessFunctionConfigFiles = await glob('**/*.json', {
    deep: 2,
    cwd: ctx.serverFunctionsDir,
  })

  const toRemove = new Set<string>()

  for (const potentialServerlessFunctionConfigFile of potentialServerlessFunctionConfigFiles) {
    try {
      const functionConfig = JSON.parse(
        await readFile(
          join(ctx.serverFunctionsDir, potentialServerlessFunctionConfigFile),
          'utf-8',
        ),
      )

      if (functionConfig?.config?.generator?.startsWith(ctx.pluginName)) {
        const parsedPath = parsePath(potentialServerlessFunctionConfigFile)

        toRemove.add(parsedPath.dir || parsedPath.name)
      }
    } catch {
      // this might be malformatted json or json that doesn't represent function configuration
      // so we just skip it in case of errors
    }
  }

  if (toRemove.size === 0) {
    return
  }

  for (const fileOrDir of await readdir(ctx.serverFunctionsDir, { withFileTypes: true })) {
    const nameWithoutExtension = parsePath(fileOrDir.name).name

    if (toRemove.has(nameWithoutExtension)) {
      await rm(join(ctx.serverFunctionsDir, fileOrDir.name), { recursive: true, force: true })
    }
  }
}
/**
 * Create a Netlify function to run the Next.js server
 */
export const createServerHandler = async (ctx: PluginContext) => {
  await tracer.withActiveSpan('createServerHandler', async () => {
    await clearStaleServerHandlers(ctx)
    await mkdir(join(ctx.serverHandlerDir, '.netlify'), { recursive: true })

    await copyNextServerCode(ctx)
    await copyNextDependencies(ctx)
    await copyHandlerDependencies(ctx)
    await writeHandlerManifest(ctx)
    await writePackageMetadata(ctx)
    await writeHandlerFile(ctx)

    await verifyHandlerDirStructure(ctx)
  })
}
