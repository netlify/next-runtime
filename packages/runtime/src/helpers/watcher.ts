import { promises } from 'fs'
import { join } from 'path'

import { build } from '@netlify/esbuild'
import { watch } from 'chokidar'

const fileList = (watched: Record<string, Array<string>>) =>
  Object.entries(watched).flatMap(([dir, files]) => files.map((file) => `${dir}/${file}`))

const start = async (base: string) => {
  const watcher = watch(['middleware.js', 'middleware.ts', 'src/middleware.js', 'src/middleware.ts'], {
    atomic: true,
    ignoreInitial: true,
    cwd: base,
  })

  const update = async (initial = false) => {
    try {
      await promises.unlink(join(base, '.netlify', 'middleware.js'))
    } catch {}

    const watchedFiles = fileList(watcher.getWatched())
    if (watchedFiles.length === 0) {
      if (!initial) {
        console.log('No middleware found')
      }
      return
    }
    if (watchedFiles.length > 1) {
      console.log('Multiple middleware files found:')
      console.log(watchedFiles.join('\n'))
      console.log('This is not supported.')

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
