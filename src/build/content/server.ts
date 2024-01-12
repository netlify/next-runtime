import { existsSync } from 'node:fs'
import { cp, mkdir, readFile, readdir, readlink, symlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import glob from 'fast-glob'

import { PluginContext } from '../plugin-context.js'

/**
 * Copy App/Pages Router Javascript needed by the server handler
 */
export const copyNextServerCode = async (ctx: PluginContext): Promise<void> => {
  const srcDir = join(ctx.publishDir, 'standalone/.next')
  const destDir = join(ctx.serverHandlerDir, '.next')

  const paths = await glob(
    [`*`, `server/*`, `server/chunks/*`, `server/edge-chunks/*`, `server/+(app|pages)/**/*.js`],
    {
      cwd: srcDir,
      extglob: true,
    },
  )

  await Promise.all(
    paths.map(async (path: string) => {
      const srcPath = join(srcDir, path)
      const destPath = join(destDir, path)

      // If this is the middleware manifest file, replace it with an empty
      // manifest to avoid running middleware again in the server handler.
      if (path === 'server/middleware-manifest.json') {
        try {
          await replaceMiddlewareManifest(srcPath, destPath)
        } catch (error) {
          throw new Error('Could not patch middleware manifest file', { cause: error })
        }

        return
      }

      await cp(srcPath, destPath, { recursive: true })
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

export const copyNextDependencies = async (ctx: PluginContext): Promise<void> => {
  const srcDir = join(ctx.publishDir, 'standalone/node_modules')
  const destDir = join(ctx.serverHandlerDir, 'node_modules')

  await cp(srcDir, destDir, { recursive: true })

  // TODO: @Lukas Holzer test this in monorepos
  // use the node_modules tree from the process.cwd() and not the one from the standalone output
  // as the standalone node_modules are already wrongly assembled by Next.js.
  // see: https://github.com/vercel/next.js/issues/50072
  await recreateNodeModuleSymlinks(ctx.resolve('node_modules'), destDir)
}

export const writeTagsManifest = async (ctx: PluginContext): Promise<void> => {
  const manifest = await ctx.getPrerenderManifest()

  const routes = Object.entries(manifest.routes).map(async ([route, definition]) => {
    let tags

    // app router
    if (definition.dataRoute?.endsWith('.rsc')) {
      const path = join(ctx.publishDir, `server/app/${route === '/' ? '/index' : route}.meta`)
      try {
        const file = await readFile(path, 'utf-8')
        const meta = JSON.parse(file)
        tags = meta.headers['x-next-cache-tags']
      } catch {
        // Parallel route default layout has no prerendered page, so don't warn about it
        if (!definition.dataRoute?.endsWith('/default.rsc')) {
          console.log(`Unable to read cache tags for: ${path}`)
        }
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
    join(ctx.serverHandlerDir, '.netlify/tags-manifest.json'),
    JSON.stringify(Object.fromEntries(await Promise.all(routes))),
    'utf-8',
  )
}

/**
 * Generates a copy of the middleware manifest without any middleware in it. We
 * do this because we'll run middleware in an edge function, and we don't want
 * to run it again in the server handler.
 */
const replaceMiddlewareManifest = async (sourcePath: string, destPath: string) => {
  await mkdir(dirname(destPath), { recursive: true })

  const data = await readFile(sourcePath, 'utf8')
  const manifest = JSON.parse(data)

  // TODO: Check for `manifest.version` and write an error to the system log
  // when we find a value that is not equal to 2. This will alert us in case
  // Next.js starts using a new format for the manifest and we're writing
  // one with the old version.
  const newManifest = {
    ...manifest,
    middleware: {},
  }
  const newData = JSON.stringify(newManifest)

  await writeFile(destPath, newData)
}
