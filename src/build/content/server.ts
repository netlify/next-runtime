import { NetlifyPluginOptions } from '@netlify/build'
import glob from 'fast-glob'
import { cp, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { getPrerenderManifest } from '../config.js'
import { SERVER_HANDLER_DIR } from '../constants.js'

/**
 * Copy App/Pages Router Javascript needed by the server handler
 */
export const copyNextServerCode = async ({
  constants: { PUBLISH_DIR },
}: Pick<NetlifyPluginOptions, 'constants'>): Promise<void> => {
  const src = resolve(PUBLISH_DIR, 'standalone/.next')
  const dest = resolve(SERVER_HANDLER_DIR, '.next')

  const paths = await glob([`*`, `server/*`, `server/chunks/*`, `server/+(app|pages)/**/*.js`], {
    cwd: src,
    extglob: true,
  })

  await Promise.all(
    paths.map(async (path: string) => {
      await cp(join(src, path), join(dest, path), { recursive: true })
    }),
  )
}

export const copyNextDependencies = async ({
  constants: { PUBLISH_DIR },
}: Pick<NetlifyPluginOptions, 'constants'>): Promise<void> => {
  const src = resolve(PUBLISH_DIR, 'standalone/node_modules')
  const dest = resolve(SERVER_HANDLER_DIR, 'node_modules')

  const paths = await glob([`**`], {
    cwd: src,
    extglob: true,
  })

  await Promise.all(
    paths.map(async (path: string) => {
      await cp(join(src, path), join(dest, path), { recursive: true })
    }),
  )
}

export const writeTagsManifest = async ({
  constants: { PUBLISH_DIR },
}: Pick<NetlifyPluginOptions, 'constants'>): Promise<void> => {
  const manifest = await getPrerenderManifest({ PUBLISH_DIR })

  const routes = Object.entries(manifest.routes).map(async ([route, definition]) => {
    let tags

    // app router
    if (definition.dataRoute?.endsWith('.rsc')) {
      const path = resolve(PUBLISH_DIR, `server/app/${route === '/' ? '/index' : route}.meta`)
      try {
        const file = await readFile(path, 'utf-8')
        const meta = JSON.parse(file)
        tags = meta.headers['x-next-cache-tags']
      } catch (error) {
        console.log(`Unable to read cache tags for: ${path}`)
      }
    }

    // pages router
    if (definition.dataRoute?.endsWith('.json')) {
      tags = `_N_T_${route}`
    }

    // route handler
    if (definition.dataRoute === null) {
      tags = definition.initialHeaders?.['x-next-cache-tags']
    }

    return [route, tags]
  })

  await writeFile(
    resolve(resolve(SERVER_HANDLER_DIR, '.netlify/tags-manifest.json')),
    JSON.stringify(Object.fromEntries(await Promise.all(routes))),
    'utf-8',
  )
}
