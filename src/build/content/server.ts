import { existsSync } from 'node:fs'
import { cp, mkdir, readFile, readdir, readlink, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
// eslint-disable-next-line no-restricted-imports
import { dirname, join, resolve, sep } from 'node:path'
import { sep as posixSep } from 'node:path/posix'

import glob from 'fast-glob'

import { RUN_CONFIG } from '../../run/constants.js'
import { PluginContext } from '../plugin-context.js'

const toPosixPath = (path: string) => path.split(sep).join(posixSep)

/**
 * Copy App/Pages Router Javascript needed by the server handler
 */
export const copyNextServerCode = async (ctx: PluginContext): Promise<void> => {
  // update the dist directory inside the required-server-files.json to work with
  // nx monorepos and other setups where the dist directory is modified
  const reqServerFilesPath = join(
    ctx.standaloneRootDir,
    ctx.relPublishDir,
    'required-server-files.json',
  )
  const reqServerFiles = JSON.parse(await readFile(reqServerFilesPath, 'utf-8'))

  // if the resolved dist folder does not match the distDir of the required-server-files.json
  // this means the path got altered by a plugin like nx and contained ../../ parts so we have to reset it
  // to point to the correct lambda destination
  if (
    toPosixPath(ctx.distDir).replace(new RegExp(`^${ctx.packagePath}/?`), '') !== reqServerFiles.config.distDir
  ) {
    // set the distDir to the latest path portion of the publish dir
    reqServerFiles.config.distDir = ctx.nextDistDir
    await writeFile(reqServerFilesPath, JSON.stringify(reqServerFiles))
  }

  // ensure the directory exists before writing to it
  await mkdir(ctx.serverHandlerDir, { recursive: true })
  // write our run-config.json to the root dir so that we can easily get the runtime config of the required-server-files.json
  // without the need to know about the monorepo or distDir configuration upfront.
  await writeFile(
    join(ctx.serverHandlerDir, RUN_CONFIG),
    JSON.stringify(reqServerFiles.config),
    'utf-8',
  )

  const srcDir = join(ctx.standaloneDir, ctx.nextDistDir)
  // if the distDir got resolved and altered use the nextDistDir instead
  const nextFolder = toPosixPath(ctx.distDir) === toPosixPath(ctx.buildConfig.distDir) ? ctx.distDir : ctx.nextDistDir
  const destDir = join(ctx.serverHandlerDir, nextFolder)

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

      await cp(srcPath, destPath, { recursive: true, force: true })
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
          await symlink(symlinkTarget, symlinkSrc)
        }
      }
    }),
  )
}

export const copyNextDependencies = async (ctx: PluginContext): Promise<void> => {
  const entries = await readdir(ctx.standaloneDir)
  const promises: Promise<void>[] = entries.map(async (entry) => {
    // copy all except the package.json and distDir (.next) folder as this is handled in a separate function
    // this will include the node_modules folder as well
    if (entry === 'package.json' || entry === ctx.nextDistDir) {
      return
    }
    const src = join(ctx.standaloneDir, entry)
    const dest = join(ctx.serverHandlerDir, entry)
    await cp(src, dest, { recursive: true, verbatimSymlinks: true, force: true })

    if (entry === 'node_modules') {
      await recreateNodeModuleSymlinks(ctx.resolve('node_modules'), dest)
    }
  })

  // inside a monorepo there is a root `node_modules` folder that contains all the dependencies
  const rootSrcDir = join(ctx.standaloneRootDir, 'node_modules')
  const rootDestDir = join(ctx.serverHandlerRootDir, 'node_modules')

  // use the node_modules tree from the process.cwd() and not the one from the standalone output
  // as the standalone node_modules are already wrongly assembled by Next.js.
  // see: https://github.com/vercel/next.js/issues/50072
  if (existsSync(rootSrcDir) && ctx.standaloneRootDir !== ctx.standaloneDir) {
    promises.push(
      cp(rootSrcDir, rootDestDir, { recursive: true, verbatimSymlinks: true }).then(() =>
        recreateNodeModuleSymlinks(resolve('node_modules'), rootDestDir),
      ),
    )
  }

  await Promise.all(promises)

  // detect if it might lead to a runtime issue and throw an error upfront on build time instead of silently failing during runtime
  const require = createRequire(ctx.serverHandlerDir)
  try {
    const nextEntryAbsolutePath = require.resolve('next')
    const nextRequire = createRequire(nextEntryAbsolutePath)
    nextRequire.resolve('styled-jsx')
  } catch {
    throw new Error(
      'node_modules are not installed correctly, if you are using pnpm please set the public hoist pattern to: `public-hoist-pattern[]=*`.\n' +
        'Refer to your docs for more details: https://docs.netlify.com/integrations/frameworks/next-js/overview/#pnpm-support',
    )
  }
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
