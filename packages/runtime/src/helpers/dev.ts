import { join } from 'path'

import type { OnPreBuild } from '@netlify/build'
import execa from 'execa'

import { writeDevEdgeFunction } from './edge'
import { patchNextFiles } from './files'

// The types haven't been updated yet
export const onPreDev: OnPreBuild = async ({ constants, netlifyConfig }) => {
  const base = netlifyConfig.build.base ?? process.cwd()

  // Need to patch the files, because build might not have been run
  await patchNextFiles(base)

  await writeDevEdgeFunction(constants)
  // Don't await this or it will never finish
  execa.node(join(__dirname, 'watcher.js'), [base], {
    stdio: 'inherit',
  })
}
