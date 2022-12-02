import { promises } from 'fs'
import { join } from 'path'

import { OnPreBuild } from '@netlify/build'
import { build } from '@netlify/esbuild'
import { watch } from 'chokidar'

import { writeDevEdgeFunction } from './edge'
import { patchNextFiles } from './files'

const fileList = (watched: Record<string, Array<string>>) =>
  Object.entries(watched).flatMap(([dir, files]) => files.map((file) => `${dir}/${file}`))

let watcher

// The types haven't been updated yet
export const onPreDev: OnPreBuild = async ({ constants, netlifyConfig }) => {
  const base = netlifyConfig.build.base ?? process.cwd()

  // Need to patch the files, because build might not have been run
  await patchNextFiles(base)

  await writeDevEdgeFunction(constants)

  watcher = watch(['middleware.js', 'middleware.ts', 'src/middleware.js', 'src/middleware.ts'], {
    persistent: true,
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
        outfile: '.next/middleware.js',
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

  const promise = new Promise<void>((resolve) => {
    process.on('SIGINT', () => {
      watcher.close()
      resolve()
    })
  })
}
