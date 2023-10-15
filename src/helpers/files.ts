import { existsSync } from 'node:fs'

import { NetlifyPluginConstants } from '@netlify/build'
import { copySync, moveSync } from 'fs-extra/esm'

import { BUILD_DIR } from './constants.js'

/**
 * Move the Next.js build output to a temporary directory
 */
export const moveBuildOutput = ({ PUBLISH_DIR }: NetlifyPluginConstants) => {
  moveSync(PUBLISH_DIR, BUILD_DIR, { overwrite: true })
}

/**
 * Move static assets so they are uploaded to the Netlify CDN
 */
export const moveStaticAssets = ({ PUBLISH_DIR }: NetlifyPluginConstants) => {
  if (existsSync('public')) {
    copySync('public', PUBLISH_DIR)
  }
  copySync(`${BUILD_DIR}/static/`, `${PUBLISH_DIR}/_next/static`)
}
