import { promises } from 'fs'
import { join } from 'path'

import { build } from '@netlify/esbuild'
import { watch } from 'chokidar'

const fileList = (watched: Record<string, Array<string>>) =>
  Object.entries(watched).flatMap(([dir, files]) => files.map((file) => join(dir, file)))

const start = async (base: string) => {
  const watcher = watch(['middleware.js', 'middleware.ts', 'src/middleware.js', 'src/middleware.ts'], {
    // Try and ensure renames just emit one event
    atomic: true,
    // Don't emit for every watched file, just once after the scan is done
    ignoreInitial: true,
    cwd: base,
  })

  const update = async (initial = false) => {
    try {
      // Start by deleting the old file. If we error out, we don't want to leave the old file around
      await promises.unlink(join(base, '.netlify', 'middleware.js'))
    } catch {
      // Ignore, because it's fine if it didn't exist
    }
    // The list of watched files is an object with the directory as the key and an array of files as the value.
    // We need to flatten this into a list of files
    const watchedFiles = fileList(watcher.getWatched())
    if (watchedFiles.length === 0) {
      if (!initial) {
        // Only log on subsequent builds, because having it on first build makes it seem like a warning, when it's a normal state
        console.log('No middleware found')
      }
      return
    }
    if (watchedFiles.length > 1) {
      console.log('Multiple middleware files found:')
      console.log(watchedFiles.join('\n'))
      console.log('This is not supported.')
      // Return without compiling anything
      return
    }
    console.log(`${initial ? 'Building' : 'Rebuilding'} middleware ${watchedFiles[0]}...`)
    try {
      await build({
        entryPoints: watchedFiles,
        outfile: join(base, '.netlify', 'middleware.js'),
        bundle: true,
        format: 'esm',
        target: 'esnext',
      })
    } catch (error) {
      console.error(error)
      return
    }

    console.log('...done')
  }

  try {
    watcher
      .on('change', (path) => {
        console.log(`File ${path} has been changed`)
        update()
      })
      .on('add', (path) => {
        console.log(`File ${path} has been added`)
        update()
      })
      .on('unlink', (path) => {
        console.log(`File ${path} has been removed`)
        update()
      })
      .on('ready', () => {
        console.log('Initial scan complete. Ready for changes')
        // This only happens on the first scan
        update(true)
      })
    await new Promise((resolve) => {
      watcher.on('close', resolve)
    })
  } finally {
    await watcher.close()
  }
}

start(process.argv[2]).catch((error) => {
  console.error(error)
  // eslint-disable-next-line n/no-process-exit
  process.exit(1)
})
