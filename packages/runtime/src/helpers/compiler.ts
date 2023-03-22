import { promises } from 'fs'
import { join } from 'path'

import { build } from '@netlify/esbuild'
import { FSWatcher, watch } from 'chokidar'

// For more information on Next.js middleware, see https://nextjs.org/docs/advanced-features/middleware

// These are the locations that a middleware file can exist in a Next.js application
// If other possible locations are added by Next.js, they should be added here.
const MIDDLEWARE_FILE_LOCATIONS: Readonly<string[]> = [
  'middleware.js',
  'middleware.ts',
  'src/middleware.js',
  'src/middleware.ts',
]

const toFileList = (watched: Record<string, Array<string>>) =>
  Object.entries(watched).flatMap(([dir, files]) => files.map((file) => join(dir, file)))

/**
 * Compile the middleware file using esbuild
 */

const buildMiddlewareFile = async (entryPoints: Array<string>, base: string) => {
  try {
    await build({
      entryPoints,
      outfile: join(base, '.netlify', 'middleware.js'),
      bundle: true,
      format: 'esm',
      target: 'esnext',
      absWorkingDir: base,
    })
  } catch (error) {
    console.error(error.toString())
  }
}

/**
 * We only compile middleware if there's exactly one file. If there's more than one, we log a warning and don't compile.
 */
const shouldFilesBeCompiled = (watchedFiles: Array<string>, isFirstRun: boolean) => {
  if (watchedFiles.length === 0) {
    if (!isFirstRun) {
      // Only log on subsequent builds, because having it on first build makes it seem like a warning, when it's a normal state
      console.log('No middleware found')
    }
    return false
  }
  if (watchedFiles.length > 1) {
    console.log('Multiple middleware files found:')
    console.log(watchedFiles.join('\n'))
    console.log('This is not supported.')
    return false
  }
  return true
}

const updateWatchedFiles = async (watcher: FSWatcher, base: string, isFirstRun = false) => {
  try {
    // Start by deleting the old file. If we error out, we don't want to leave the old file around
    await promises.unlink(join(base, '.netlify', 'middleware.js'))
  } catch {
    // Ignore, because it's fine if it didn't exist
  }
  // The list of watched files is an object with the directory as the key and an array of files as the value.
  // We need to flatten this into a list of files
  const watchedFiles = toFileList(watcher.getWatched())
  if (!shouldFilesBeCompiled(watchedFiles, isFirstRun)) {
    watcher.emit('build')
    return
  }
  console.log(`${isFirstRun ? 'Building' : 'Rebuilding'} middleware ${watchedFiles[0]}...`)
  await buildMiddlewareFile(watchedFiles, base)
  console.log('...done')
  watcher.emit('build')
}

/**
 * Watch for changes to the middleware file location. When a change is detected, recompile the middleware file.
 *
 * @param base The base directory to watch
 * @returns a file watcher and a promise that resolves when the initial scan is complete.
 */
export const watchForMiddlewareChanges = (base: string) => {
  const watcher = watch(MIDDLEWARE_FILE_LOCATIONS, {
    // Try and ensure renames just emit one event
    atomic: true,
    // Don't emit for every watched file, just once after the scan is done
    ignoreInitial: true,
    cwd: base,
  })

  watcher
    .on('change', (path) => {
      console.log(`File ${path} has been changed`)
      updateWatchedFiles(watcher, base)
    })
    .on('add', (path) => {
      console.log(`File ${path} has been added`)
      updateWatchedFiles(watcher, base)
    })
    .on('unlink', (path) => {
      console.log(`File ${path} has been removed`)
      updateWatchedFiles(watcher, base)
    })

  return {
    watcher,
    isReady: new Promise<void>((resolve) => {
      watcher.on('ready', async () => {
        console.log('Initial scan for middleware file complete. Ready for changes.')
        // This only happens on the first scan
        await updateWatchedFiles(watcher, base, true)
        console.log('Ready')
        resolve()
      })
    }),
    nextBuild: () =>
      new Promise<void>((resolve) => {
        watcher.once('build', resolve)
      }),
  }
}
