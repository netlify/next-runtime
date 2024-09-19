import { rm } from 'fs/promises'

import type { NetlifyPluginOptions } from '@netlify/build'
import { trace } from '@opentelemetry/api'
import { wrapTracer } from '@opentelemetry/api/experimental'

import { restoreBuildCache, saveBuildCache } from './build/cache.js'
import { copyPrerenderedContent } from './build/content/prerendered.js'
import {
  copyStaticAssets,
  copyStaticContent,
  copyStaticExport,
  publishStaticDir,
  unpublishStaticDir,
} from './build/content/static.js'
import { clearStaleEdgeHandlers, createEdgeHandlers } from './build/functions/edge.js'
import { clearStaleServerHandlers, createServerHandler } from './build/functions/server.js'
import { setImageConfig } from './build/image-cdn.js'
import { PluginContext } from './build/plugin-context.js'
import {
  verifyAdvancedAPIRoutes,
  verifyNetlifyFormsWorkaround,
  verifyPublishDir,
} from './build/verification.js'

const tracer = wrapTracer(trace.getTracer('Next.js runtime'))

export const onPreDev = async (options: NetlifyPluginOptions) => {
  await tracer.withActiveSpan('onPreDev', async () => {
    const context = new PluginContext(options)

    // Blob files left over from `ntl build` interfere with `ntl dev` when working with regional blobs
    await rm(context.blobDir, { recursive: true, force: true })
  })
}

export const onPreBuild = async (options: NetlifyPluginOptions) => {
  await tracer.withActiveSpan('onPreBuild', async () => {
    // Enable Next.js standalone mode at build time
    process.env.NEXT_PRIVATE_STANDALONE = 'true'
    const ctx = new PluginContext(options)
    if (options.constants.IS_LOCAL) {
      // Only clear directory if we are running locally as then we might have stale functions from previous
      // local builds. Directory clearing interferes with other integrations by deleting functions produced by them
      // so ideally this is completely avoided.
      await clearStaleServerHandlers(ctx)
      await clearStaleEdgeHandlers(ctx)
    } else {
      await restoreBuildCache(ctx)
    }
  })
}

export const onBuild = async (options: NetlifyPluginOptions) => {
  await tracer.withActiveSpan('onBuild', async (span) => {
    const ctx = new PluginContext(options)

    verifyPublishDir(ctx)

    span.setAttribute('next.buildConfig', JSON.stringify(ctx.buildConfig))
    span.setAttribute(
      'next.deployStrategy',
      JSON.stringify({
        useFrameworksAPI: ctx.useFrameworksAPI,
        blobsStrategy: ctx.blobsStrategy,
        edgeFunctionsConfigStrategy: ctx.edgeFunctionsConfigStrategy,
        serverHandlerConfigStrategy: ctx.serverHandlerConfigStrategy,
      }),
    )

    // only save the build cache if not run via the CLI
    if (!options.constants.IS_LOCAL) {
      await saveBuildCache(ctx)
    }

    // static exports only need to be uploaded to the CDN and setup /_next/image handler
    if (ctx.buildConfig.output === 'export') {
      return Promise.all([copyStaticExport(ctx), setImageConfig(ctx)])
    }

    await verifyAdvancedAPIRoutes(ctx)
    await verifyNetlifyFormsWorkaround(ctx)

    await Promise.all([
      copyStaticAssets(ctx),
      copyStaticContent(ctx),
      copyPrerenderedContent(ctx),
      createServerHandler(ctx),
      createEdgeHandlers(ctx),
      setImageConfig(ctx),
    ])
  })
}

export const onPostBuild = async (options: NetlifyPluginOptions) => {
  await tracer.withActiveSpan('onPostBuild', async () => {
    await publishStaticDir(new PluginContext(options))
  })
}

export const onSuccess = async () => {
  await tracer.withActiveSpan('onSuccess', async () => {
    const prewarm = [process.env.DEPLOY_URL, process.env.DEPLOY_PRIME_URL, process.env.URL].filter(
      // If running locally then the deploy ID is a placeholder value. Filtering for `https://0--` removes it.
      (url?: string): url is string => Boolean(url && !url.startsWith('https://0--')),
    )
    await Promise.allSettled(prewarm.map((url) => fetch(url)))
  })
}

export const onEnd = async (options: NetlifyPluginOptions) => {
  await tracer.withActiveSpan('onEnd', async () => {
    await unpublishStaticDir(new PluginContext(options))
  })
}
