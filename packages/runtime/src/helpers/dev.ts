import type { Buffer } from 'buffer'
import { resolve } from 'path'
import { Transform } from 'stream'

import { OnPreBuild } from '@netlify/build'
import execa from 'execa'
import { unlink } from 'fs-extra'
import mergeStream from 'merge-stream'

import { writeDevEdgeFunction } from './edge'
import { patchNextFiles } from './files'

// The types haven't been updated yet
export const onPreDev: OnPreBuild = async ({ constants, netlifyConfig }) => {
  const base = netlifyConfig.build.base ?? process.cwd()

  // Need to patch the files, because build might not have been run
  await patchNextFiles(base)

  //  Clean up old functions
  await unlink(resolve('.netlify', 'middleware.js')).catch(() => {
    // Ignore if it doesn't exist
  })
  await writeDevEdgeFunction(constants)

  // Eventually we might want to do this via esbuild's API, but for now the CLI works fine
  const common = [`--bundle`, `--outdir=${resolve('.netlify')}`, `--format=esm`, `--target=esnext`, '--watch']
  const opts = {
    all: true,
    env: { ...process.env, FORCE_COLOR: '1' },
  }
  // TypeScript
  const tsout = execa(`esbuild`, [...common, resolve(base, 'middleware.ts')], opts).all

  // JavaScript
  const jsout = execa(`esbuild`, [...common, resolve(base, 'middleware.js')], opts).all

  const filter = new Transform({
    transform(chunk: Buffer, encoding, callback) {
      const str = chunk.toString(encoding)

      // Skip if message includes this, because we run even when the files are missing
      if (!str.includes('[ERROR] Could not resolve')) {
        this.push(chunk)
      }
      callback()
    },
  })

  mergeStream(tsout, jsout).pipe(filter).pipe(process.stdout)

  // Don't return the promise because we don't want to wait for the child process to finish
}
