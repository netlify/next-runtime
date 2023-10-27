import type { OutgoingHttpHeaders } from 'http'
import { readFile } from 'node:fs/promises'

import type { PrerenderedContentEntry } from './files.js'

export const buildCacheValue = (paths: PrerenderedContentEntry) => {
  // app dir
  if (paths.data && paths.meta) {
    return buildPageCacheValue(paths, true)
  }
  // pages dir
  if (paths.data) {
    return buildPageCacheValue(paths, false)
  }
  // route handlers
  if (paths.meta) {
    return buildRouteCacheValue(paths)
  }
  // fetch cache
  if (!paths.data && !paths.meta) {
    return buildFetchCacheValue(paths)
  }
}

const buildPageCacheValue = async (paths: PrerenderedContentEntry, appDir: boolean) => {
  const body = await readFile(paths.body, 'utf8')
  const data = await readFile(paths.data as string, 'utf8')

  let meta
  if (appDir) {
    try {
      meta = JSON.parse(await readFile(paths.meta as string, 'utf8'))
    } catch {}
  }

  return {
    lastModified: Date.now(),
    value: {
      kind: 'PAGE',
      html: body,
      pageData: appDir ? data : JSON.parse(data),
      headers: meta?.headers,
      status: meta?.status,
    },
  }
}

const buildRouteCacheValue = async (paths: PrerenderedContentEntry) => {
  const body = await readFile(paths.body, 'utf8')

  let meta
  try {
    meta = JSON.parse(await readFile(paths.meta as string, 'utf8'))
  } catch {}

  return {
    lastModified: Date.now(),
    value: {
      kind: 'ROUTE',
      body,
      headers: meta?.headers,
      status: meta?.status,
    },
  }
}

const buildFetchCacheValue = async (paths: PrerenderedContentEntry) => {
  const body = JSON.parse(await readFile(paths.body, 'utf8'))

  return {
    lastModified: Date.now(),
    value: body,
  }
}
