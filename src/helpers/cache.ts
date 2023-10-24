import { readFile } from 'node:fs/promises'

import { BUILD_DIR } from './constants.js'
import type { MetaFile } from './types.js'

export const buildCacheValue = (path: string, ext: string) => {
  const isRoute = ext === '.body'
  const isPage = path.startsWith('server/pages') && ext === '.html'
  const isApp = path.startsWith('server/app') && ext === '.html'
  const isFetchCache = path.startsWith('cache/fetch-cache')

  switch (true) {
    case isRoute:
      return buildRouteCacheValue(path)
    case isPage:
      return buildPageCacheValue(path, false)
    case isApp:
      return buildPageCacheValue(path, true)
    case isFetchCache:
      return buildFetchCacheValue(path)
    default:
      return {}
  }
}

const buildPageCacheValue = async (path: string, appDir: boolean) => {
  try {
    const pageData = appDir
      ? await readFile(`${BUILD_DIR}/.next/${path}.rsc`, 'utf8')
      : JSON.parse(await readFile(`${BUILD_DIR}/.next/${path}.json`, 'utf8'))
    let meta: MetaFile = {}

    if (appDir) {
      // eslint-disable-next-line max-depth
      try {
        meta = await JSON.parse(await readFile(`${BUILD_DIR}/.next/${path}.meta`, 'utf8'))
      } catch {}
    }

    return {
      lastModified: Date.now(),
      value: {
        kind: 'PAGE',
        html: await readFile(`${BUILD_DIR}/.next/${path}.html`, 'utf8'),
        pageData,
        headers: meta.headers,
        status: meta.status,
      },
    }
  } catch (error) {
    console.log(error)
  }
}

const buildFetchCacheValue = async (path: string) => {
  const parsedData = JSON.parse(await readFile(`${BUILD_DIR}/.next/${path}`, 'utf8'))
  return {
    lastModified: Date.now(),
    value: parsedData,
  }
}

const buildRouteCacheValue = async (path: string) => {
  try {
    const data = await readFile(`${BUILD_DIR}/.next/${path}.body`, 'utf8')
    const meta = await JSON.parse(await readFile(`${BUILD_DIR}/.next/${path}.meta`, 'utf8'))
    return {
      lastModified: Date.now(),
      value: {
        kind: 'ROUTE',
        body: data,
        headers: meta.headers,
        status: meta.status,
      },
    }
  } catch {}
}
