import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { join as posixJoin } from 'node:path/posix'

import { trace } from '@opentelemetry/api'
import { wrapTracer } from '@opentelemetry/api/experimental'
import { glob } from 'fast-glob'

import {
  copyNextDependencies,
  copyNextServerCode,
  verifyHandlerDirStructure,
  writeTagsManifest,
} from '../content/server.js'
import { PPR_HANDLER_NAME, PluginContext, SERVER_HANDLER_NAME } from '../plugin-context.js'

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

const writePPRHandlerManifest = async (ctx: PluginContext) => {
  await writeFile(
    join(ctx.pprHandlerDir, `${PPR_HANDLER_NAME}.json`),
    JSON.stringify({
      config: {
        name: 'Next.js PPR Handler',
        generator: `${ctx.pluginName}@${ctx.pluginVersion}`,
        nodeBundler: 'none',
        includedFiles: ['**'],
        includedFilesBasePath: ctx.pprHandlerDir,
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
const getHandlerFile = async (
  ctx: PluginContext,
  template = 'handler.tmpl.js',
): Promise<string> => {
  const templatesDir = join(ctx.pluginDir, 'dist/build/templates')

  const templateVariables: Record<string, string> = {
    '{{useRegionalBlobs}}': ctx.useRegionalBlobs.toString(),
    '{{cwd}}': ctx.relativeAppDir.length === 0 ? '.' : posixJoin(ctx.lambdaWorkingDirectory),
    '{{nextServerHandler}}': ctx.nextServerHandler,
  }

  return applyTemplateVariables(
    await readFile(join(templatesDir, template), 'utf-8'),
    templateVariables,
  )
}

const writeHandlerFile = async (ctx: PluginContext) => {
  const handler = await getHandlerFile(ctx)
  await writeFile(join(ctx.serverHandlerRootDir, `${SERVER_HANDLER_NAME}.mjs`), handler)
}

const generatePPRHandler = async (ctx: PluginContext) => {
  const { routes } = await ctx.getPrerenderManifest()
  if (!Object.values(routes).some((route) => route.experimentalPPR)) {
    return
  }

  // Copy the regular handler to the PPR handler
  await cp(ctx.serverHandlerRootDir, ctx.pprHandlerDir, {
    recursive: true,
    force: true,
    verbatimSymlinks: true,
  })
  // Remove the default server handler entrypoint
  await rm(join(ctx.pprHandlerDir, `${SERVER_HANDLER_NAME}.mjs`))
  // Write the PPR handler entrypoint
  const handler = await getHandlerFile(ctx, 'handler-ppr.tmpl.js')
  await writeFile(join(ctx.pprHandlerDir, `${PPR_HANDLER_NAME}.mjs`), handler)

  await writePPRHandlerManifest(ctx)
}

/**
 * Create a Netlify function to run the Next.js server
 */
export const createServerHandler = async (ctx: PluginContext) => {
  await tracer.withActiveSpan('createServerHandler', async () => {
    await rm(ctx.serverFunctionsDir, { recursive: true, force: true })
    await mkdir(join(ctx.serverHandlerDir, '.netlify'), { recursive: true })

    await copyNextServerCode(ctx)
    await copyNextDependencies(ctx)
    await writeTagsManifest(ctx)
    await copyHandlerDependencies(ctx)
    await writeHandlerManifest(ctx)
    await writePackageMetadata(ctx)
    await writeHandlerFile(ctx)

    await verifyHandlerDirStructure(ctx)

    await generatePPRHandler(ctx)
  })
}
