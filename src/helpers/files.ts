import { existsSync } from 'node:fs'

import { NetlifyPluginConstants } from '@netlify/build'
import { copySync, moveSync } from 'fs-extra/esm'

import { NEXT_BUILD_DIR } from './constants.js'

/**
 * Stash the Next.js build output in a temporary directory
 */
export const stashBuildOutput = ({ PUBLISH_DIR }: NetlifyPluginConstants) => {
  moveSync(PUBLISH_DIR, NEXT_BUILD_DIR, { overwrite: true })
}

/**
 * Move static assets so they are uploaded to the Netlify CDN
 */
export const moveStaticAssets = ({ PUBLISH_DIR }: NetlifyPluginConstants) => {
  if (existsSync('public')) {
    copySync('public', PUBLISH_DIR)
  }
  copySync(`${NEXT_BUILD_DIR}/static/`, `${PUBLISH_DIR}/_next/static`)
}
