import { resolve } from 'path'

import { OnPreBuild } from '@netlify/build'
import execa from 'execa'
import { unlink, existsSync } from 'fs-extra'

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
  if (!existsSync(resolve(base, 'middleware.ts')) && !existsSync(resolve(base, 'middleware.js'))) {
    console.log(
      "No middleware found. Create a 'middleware.ts' or 'middleware.js' file in your project root to add custom middleware.",
    )
  } else {
    console.log('Watching for changes in Next.js middleware...')
  }
  // Eventually we might want to do this via esbuild's API, but for now the CLI works fine
  const childProcess = execa(`esbuild`, [
    `--bundle`,
    `--outdir=${resolve('.netlify')}`,
    `--format=esm`,
    `--target=esnext`,
    '--watch',
    // Watch for both, because it can have either ts or js
    resolve(base, 'middleware.ts'),
    resolve(base, 'middleware.js'),
  ])

  childProcess.stdout.pipe(process.stdout)
  childProcess.stderr.pipe(process.stderr)
  // Don't return the promise because we don't want to wait for the child process to finish
}
