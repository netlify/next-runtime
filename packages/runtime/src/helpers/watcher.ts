import { promises } from 'fs'
import { join } from 'path'

import { build } from '@netlify/esbuild'
import { FSWatcher, watch } from 'chokidar'

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
    })
  } catch (error) {
    console.error(error)
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
    return
  }

  console.log(`${isFirstRun ? 'Building' : 'Rebuilding'} middleware ${watchedFiles[0]}...`)
  await buildMiddlewareFile(watchedFiles, base)
  console.log('...done')
}

const start = async (base: string, once = false) => {
  const watcher = watch(['middleware.js', 'middleware.ts', 'src/middleware.js', 'src/middleware.ts'], {
    // Try and ensure renames just emit one event
    atomic: true,
    // Don't emit for every watched file, just once after the scan is done
    ignoreInitial: true,
    cwd: base,
  })

  try {
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
      .on('ready', async () => {
        console.log('Initial scan complete. Ready for changes')
        // This only happens on the first scan
        await updateWatchedFiles(watcher, base, true)
        if (once) {
          watcher.close()
        }
      })

    await new Promise((resolve) => {
      watcher.on('close', resolve)
    })
  } finally {
    await watcher.close()
  }
}

start(process.argv[2], process.argv[3] === '--once').catch((error) => {
  console.error(error)
  // eslint-disable-next-line n/no-process-exit
  process.exit(1)
})
