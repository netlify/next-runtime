import { existsSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { trace } from '@opentelemetry/api'
import { wrapTracer } from '@opentelemetry/api/experimental'
import { glob } from 'fast-glob'
import pLimit from 'p-limit'
import { satisfies } from 'semver'

import type {
  CachedFetchValueForMultipleVersions,
  NetlifyCachedAppPageValue,
  NetlifyCachedPageValue,
  NetlifyCachedRouteValue,
  NetlifyCacheHandlerValue,
  NetlifyIncrementalCacheValue,
} from '../../shared/cache-types.cjs'
import type { PluginContext } from '../plugin-context.js'
import { verifyNetlifyForms } from '../verification.js'

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
  const entry = JSON.stringify({
    lastModified,
    value,
  } satisfies NetlifyCacheHandlerValue)
  await ctx.setBlob(route, entry)
}

/**
 * Normalize routes by stripping leading slashes and ensuring root path is index
 */
const routeToFilePath = (path: string) => (path === '/' ? '/index' : path)

const buildPagesCacheValue = async (
  path: string,
  shouldUseEnumKind: boolean,
): Promise<NetlifyCachedPageValue> => ({
  kind: shouldUseEnumKind ? 'PAGES' : 'PAGE',
  html: await readFile(`${path}.html`, 'utf-8'),
  pageData: JSON.parse(await readFile(`${path}.json`, 'utf-8')),
  headers: undefined,
  status: undefined,
})

const buildAppCacheValue = async (
  path: string,
  shouldUseAppPageKind: boolean,
): Promise<NetlifyCachedAppPageValue | NetlifyCachedPageValue> => {
  const meta = JSON.parse(await readFile(`${path}.meta`, 'utf-8'))
  const html = await readFile(`${path}.html`, 'utf-8')

  // supporting both old and new cache kind for App Router pages - https://github.com/vercel/next.js/pull/65988
  if (shouldUseAppPageKind) {
    return {
      kind: 'APP_PAGE',
      html,
      rscData: await readFile(`${path}.rsc`, 'base64').catch(() =>
        readFile(`${path}.prefetch.rsc`, 'base64'),
      ),
      ...meta,
    }
  }

  const rsc = await readFile(`${path}.rsc`, 'utf-8').catch(() =>
    readFile(`${path}.prefetch.rsc`, 'utf-8'),
  )

  // Next < v14.2.0 does not set meta.status when notFound() is called directly on a page
  // Exclude Parallel routes, they are 404s when visited directly
  if (
    !meta.status &&
    rsc.includes('NEXT_NOT_FOUND') &&
    !meta.headers['x-next-cache-tags'].includes('/@')
  ) {
    meta.status = 404
  }
  return {
    kind: 'PAGE',
    html,
    pageData: rsc,
    ...meta,
  }
}

const buildRouteCacheValue = async (
  path: string,
  initialRevalidateSeconds: number | false,
  shouldUseEnumKind: boolean,
): Promise<NetlifyCachedRouteValue> => ({
  kind: shouldUseEnumKind ? 'APP_ROUTE' : 'ROUTE',
  body: await readFile(`${path}.body`, 'base64'),
  ...JSON.parse(await readFile(`${path}.meta`, 'utf-8')),
  revalidate: initialRevalidateSeconds,
})

const buildFetchCacheValue = async (
  path: string,
): Promise<CachedFetchValueForMultipleVersions> => ({
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

      // https://github.com/vercel/next.js/pull/65988 introduced Cache kind specific to pages in App Router (`APP_PAGE`).
      // Before this change there was common kind for both Pages router and App router pages
      // so we check Next.js version to decide how to generate cache values for App Router pages.
      // Note: at time of writing this code, released 15@rc uses old kind for App Router pages, while 15.0.0@canary.13 and newer canaries use new kind.
      // Looking at 15@rc release branch it was merging `canary` branch in, so the version constraint assumes that future 15@rc (and 15@latest) versions
      // will use new kind for App Router pages.
      const shouldUseAppPageKind = ctx.nextVersion
        ? satisfies(ctx.nextVersion, '>=15.0.0-canary.13 <15.0.0-d || >15.0.0-rc.0', {
            includePrerelease: true,
          })
        : false

      // https://github.com/vercel/next.js/pull/68602 changed the cache kind for Pages router pages from `PAGE` to `PAGES` and from `ROUTE` to `APP_ROUTE`.
      const shouldUseEnumKind = ctx.nextVersion
        ? satisfies(ctx.nextVersion, '>=15.0.0-canary.114 <15.0.0-d || >15.0.0-rc.0', {
            includePrerelease: true,
          })
        : false

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
                  value = await buildPagesCacheValue(
                    join(ctx.publishDir, 'server/pages', key),
                    shouldUseEnumKind,
                  )
                  break
                case meta.dataRoute?.endsWith('.rsc'):
                  value = await buildAppCacheValue(
                    join(ctx.publishDir, 'server/app', key),
                    shouldUseAppPageKind,
                  )
                  break
                case meta.dataRoute === null:
                  value = await buildRouteCacheValue(
                    join(ctx.publishDir, 'server/app', key),
                    meta.initialRevalidateSeconds,
                    shouldUseEnumKind,
                  )
                  break
                default:
                  throw new Error(`Unrecognized content: ${route}`)
              }

              // Netlify Forms are not support and require a workaround
              if (value.kind === 'PAGE' || value.kind === 'PAGES' || value.kind === 'APP_PAGE') {
                verifyNetlifyForms(ctx, value.html)
              }

              await writeCacheEntry(key, value, lastModified, ctx)
            }),
        ),
      )

      // app router 404 pages are not in the prerender manifest
      // so we need to check for them manually
      if (existsSync(join(ctx.publishDir, `server/app/_not-found.html`))) {
        const lastModified = Date.now()
        const key = '/404'
        const value = await buildAppCacheValue(
          join(ctx.publishDir, 'server/app/_not-found'),
          shouldUseAppPageKind,
        )
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
