import { existsSync } from 'node:fs'

import { copySync } from 'fs-extra/esm'

import { NETLIFY_PUBLISH_DIR } from './constants.js'

/**
 * Ensure static assets get uploaded to the Netlify CDN
 * @param publishDir The publish directory
 */
export const publishStaticAssets = (publishDir: string) => {
  // copy user's public folder to the new publish directory
  if (existsSync('public')) {
    copySync('public', NETLIFY_PUBLISH_DIR, { overwrite: true })
  }

  // copy the Next.js static assets to the new publish directory
  copySync(`${publishDir}/static/`, `${NETLIFY_PUBLISH_DIR}/_next/static`, { overwrite: true })
}
