import { existsSync } from 'node:fs'

import { NetlifyPluginConstants } from '@netlify/build'
import { copySync, moveSync } from 'fs-extra/esm'

import { BUILD_DIR } from './constants.js'

/**
 * Move the Next.js build output from the publish dir to a temp dir
 */
export const stashBuildOutput = ({ PUBLISH_DIR }: NetlifyPluginConstants) => {
  moveSync(PUBLISH_DIR, BUILD_DIR, { overwrite: true })
}

/**
 * Move static assets to the publish dir so they upload to the CDN
 */
export const publishStaticAssets = ({ PUBLISH_DIR }: NetlifyPluginConstants) => {
  if (existsSync('public')) {
    copySync('public', PUBLISH_DIR)
  }
  copySync(`${BUILD_DIR}/static/`, `${PUBLISH_DIR}/_next/static`)
}
