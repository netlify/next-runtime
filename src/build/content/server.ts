import type { NetlifyPluginOptions } from '@netlify/build'
import glob from 'fast-glob'
import { existsSync } from 'node:fs'
import { cp, mkdir, readFile, readdir, readlink, symlink, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { getPrerenderManifest } from '../config.js'
import { SERVER_HANDLER_DIR } from '../constants.js'

/**
 * Copy App/Pages Router Javascript needed by the server handler
 */
export const copyNextServerCode = async ({
  constants: { PUBLISH_DIR },
}: Pick<NetlifyPluginOptions, 'constants'>): Promise<void> => {
  const srcDir = resolve(PUBLISH_DIR, 'standalone/.next')
  const destDir = resolve(SERVER_HANDLER_DIR, '.next')

  const paths = await glob([`*`, `server/*`, `server/chunks/*`, `server/+(app|pages)/**/*.js`], {
    cwd: srcDir,
    extglob: true,
  })

  await Promise.all(
    paths.map(async (path: string) => {
      const destPath = join(destDir, path)

      // If this is the middleware manifest file, replace it with an empty
      // manifest to avoid running middleware again in the server handler.
      if (path === 'server/middleware-manifest.json') {
        await mkdir(dirname(destPath), { recursive: true })
        await writeFile(destPath, getEmptyMiddlewareManifest())

        return
      }

      await cp(join(srcDir, path), destPath, { recursive: true })
    }),
  )
}

/**
 * Recreates the missing symlinks from the source node_modules inside the destination node_modules
 * @param src The source node_modules directory where the node_modules are located with the correct symlinks
 * @param dest The destination node_modules directory where the node_modules are located in where the symlinks are missing
 * @returns
 */
async function recreateNodeModuleSymlinks(src: string, dest: string, org?: string): Promise<void> {
  const dirents = await readdir(join(src, org || ''), { withFileTypes: true })

  await Promise.all(
    dirents.map(async (dirent) => {
      // in case of a node_module starting with an @ it is an organization scoped dependency and we have to go
      // one level deeper as those directories are symlinked
      if (dirent.name.startsWith('@')) {
        return recreateNodeModuleSymlinks(src, dest, dirent.name)
      }

      // if it is a symlink we have to recreate it in the destination node_modules if it is not existing.
      if (dirent.isSymbolicLink()) {
        const symlinkSrc = join(dest, org || '', dirent.name)
        // the location where the symlink points to
        const symlinkTarget = await readlink(join(src, org || '', dirent.name))
        const symlinkDest = join(dest, org || '', symlinkTarget)
        // only copy over symlinks that are traced through the nft bundle
        // and don't exist in the destination node_modules
        if (existsSync(symlinkDest) && !existsSync(symlinkSrc)) {
          if (org) {
            // if it is an organization folder let's create the folder first
            await mkdir(join(dest, org), { recursive: true })
          }
          await symlink(symlinkDest, symlinkSrc)
        }
      }
    }),
  )
}

export const copyNextDependencies = async ({
  constants: { PUBLISH_DIR },
}: Pick<NetlifyPluginOptions, 'constants'>): Promise<void> => {
  const srcDir = resolve(PUBLISH_DIR, 'standalone/node_modules')
  const destDir = resolve(SERVER_HANDLER_DIR, 'node_modules')

  await cp(srcDir, destDir, { recursive: true })

  // use the node_modules tree from the process.cwd() and not the one from the standalone output
  // as the standalone node_modules are already wrongly assembled by Next.js.
  // see: https://github.com/vercel/next.js/issues/50072
  await recreateNodeModuleSymlinks(resolve('node_modules'), destDir)
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

/**
 * Generates an empty middleware manifest. We don't want to run middleware in
 * the server handler, because we'll run it upstream in an edge function. So
 * we patch the manifest to make it seem like there's no middleware configured.
 */
const getEmptyMiddlewareManifest = () => {
  const manifest = {
    sortedMiddleware: [],
    middleware: {},
    functions: {},
    version: 2,
  }

  return JSON.stringify(manifest)
}
