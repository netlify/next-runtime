import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { trace } from '@opentelemetry/api'
import { wrapTracer } from '@opentelemetry/api/experimental'
import { glob } from 'fast-glob'
import pLimit from 'p-limit'

import { encodeBlobKey } from '../../shared/blobkey.js'
import type {
  CachedFetchValue,
  CachedPageValue,
  NetlifyCacheHandlerValue,
  NetlifyCachedRouteValue,
  NetlifyIncrementalCacheValue,
} from '../../shared/cache-types.cjs'
import type { NetlifyForm, PluginContext } from '../plugin-context.js'

import { detectForms } from './forms.js'

const tracer = wrapTracer(trace.getTracer('Next runtime'))

/**
 * Write a cache entry to the blob upload directory.
 */
const writeCacheEntry = async (
  route: string,
  value: NetlifyIncrementalCacheValue,
  lastModified: number,
  ctx: PluginContext,
): Promise<void> => {
  const path = join(ctx.blobDir, await encodeBlobKey(route))
  const entry = JSON.stringify({
    lastModified,
    value,
  } satisfies NetlifyCacheHandlerValue)

  await writeFile(path, entry, 'utf-8')
}

/**
 * Normalize routes by stripping leading slashes and ensuring root path is index
 */
const routeToFilePath = (path: string) => (path === '/' ? '/index' : path)

const buildPagesCacheValue = async (path: string): Promise<CachedPageValue> => ({
  kind: 'PAGE',
  html: await readFile(`${path}.html`, 'utf-8'),
  pageData: JSON.parse(await readFile(`${path}.json`, 'utf-8')),
  postponed: undefined,
  headers: undefined,
  status: undefined,
})

const buildAppCacheValue = async (path: string): Promise<CachedPageValue> => {
  const meta = JSON.parse(await readFile(`${path}.meta`, 'utf-8'))
  const rsc = await readFile(`${path}.rsc`, 'utf-8').catch(() =>
    readFile(`${path}.prefetch.rsc`, 'utf-8'),
  )

  if (!meta.status && rsc.includes('NEXT_NOT_FOUND')) {
    meta.status = 404
  }

  return {
    kind: 'PAGE',
    html: await readFile(`${path}.html`, 'utf-8'),
    pageData: rsc,
    ...meta,
  }
}

const buildRouteCacheValue = async (
  path: string,
  initialRevalidateSeconds: number | false,
): Promise<NetlifyCachedRouteValue> => ({
  kind: 'ROUTE',
  body: await readFile(`${path}.body`, 'base64'),
  ...JSON.parse(await readFile(`${path}.meta`, 'utf-8')),
  revalidate: initialRevalidateSeconds,
})

const buildFetchCacheValue = async (path: string): Promise<CachedFetchValue> => ({
  kind: 'FETCH',
  ...JSON.parse(await readFile(path, 'utf-8')),
})

/**
 * Upload prerendered content to the blob store
 */
export const copyPrerenderedContent = async (ctx: PluginContext): Promise<void> => {
  return tracer.withActiveSpan('copyPrerenderedContent', async () => {
    try {
      // ensure the blob directory exists
      await mkdir(ctx.blobDir, { recursive: true })
      // read prerendered content and build JSON key/values for the blob store
      const manifest = await ctx.getPrerenderManifest()

      const limitConcurrentPrerenderContentHandling = pLimit(10)
      const forms = new Map<string, NetlifyForm>()
      await Promise.all(
        Object.entries(manifest.routes).map(
          ([route, meta]): Promise<void> =>
            limitConcurrentPrerenderContentHandling(async () => {
              const lastModified = meta.initialRevalidateSeconds
                ? Date.now() - 31536000000
                : Date.now()
              const key = routeToFilePath(route)
              let value: NetlifyIncrementalCacheValue
              switch (true) {
                // Parallel route default layout has no prerendered page
                case meta.dataRoute?.endsWith('/default.rsc') &&
                  !existsSync(join(ctx.publishDir, 'server/app', `${key}.html`)):
                  return
                case meta.dataRoute?.endsWith('.json'):
                  if (manifest.notFoundRoutes.includes(route)) {
                    // if pages router returns 'notFound: true', build won't produce html and json files
                    return
                  }
                  value = await buildPagesCacheValue(join(ctx.publishDir, 'server/pages', key))
                  break
                case meta.dataRoute?.endsWith('.rsc'):
                  value = await buildAppCacheValue(join(ctx.publishDir, 'server/app', key))
                  break
                case meta.dataRoute === null:
                  value = await buildRouteCacheValue(
                    join(ctx.publishDir, 'server/app', key),
                    meta.initialRevalidateSeconds,
                  )
                  break
                default:
                  throw new Error(`Unrecognized content: ${route}`)
              }

              await writeCacheEntry(key, value, lastModified, ctx)
              if (value.kind === 'PAGE' && value.html) {
                const detected = detectForms(value.html)
                if (detected?.size) {
                  // TODO: work out how to add paths to form config and deal with duplicates
                  for (const [formName, form] of detected) {
                    forms.set(formName, form)
                  }
                }
              }
            }),
        ),
      )

      ctx.netlifyConfig.forms = [...forms.values()]

      console.log('forms', ctx.forms)

      // app router 404 pages are not in the prerender manifest
      // so we need to check for them manually
      if (existsSync(join(ctx.publishDir, `server/app/_not-found.html`))) {
        const lastModified = Date.now()
        const key = '/404'
        const value = await buildAppCacheValue(join(ctx.publishDir, 'server/app/_not-found'))
        await writeCacheEntry(key, value, lastModified, ctx)
      }
    } catch (error) {
      ctx.failBuild('Failed assembling prerendered content for upload', error)
    }
  })
}

/**
 * Upload fetch content to the blob store
 */
export const copyFetchContent = async (ctx: PluginContext): Promise<void> => {
  try {
    const paths = await glob(['!(*.*)'], {
      cwd: join(ctx.publishDir, 'cache/fetch-cache'),
      extglob: true,
    })

    await Promise.all(
      paths.map(async (key): Promise<void> => {
        const lastModified = Date.now() - 31536000000
        const path = join(ctx.publishDir, 'cache/fetch-cache', key)
        const value = await buildFetchCacheValue(path)
        await writeCacheEntry(key, value, lastModified, ctx)
      }),
    )
  } catch (error) {
    ctx.failBuild('Failed assembling fetch content for upload', error)
  }
}
