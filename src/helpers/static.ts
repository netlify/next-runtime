import { existsSync, copySync, moveSync } from 'fs-extra'

import { PUBLISH_STAGING_DIR } from './constants.js'

const stageStaticAssets = (publishDir: string) => {
  // TODO: consider caching here to avoid copying on every build
  if (existsSync('public')) {
    copySync('public', PUBLISH_STAGING_DIR, { overwrite: true })
  }
  copySync(`${publishDir}/static/`, `${PUBLISH_STAGING_DIR}/_next/static`, { overwrite: true })
}

const promoteStaticAssets = (publishDir: string) => {
  moveSync(publishDir, '.netlify/.next', { overwrite: true })
  moveSync(PUBLISH_STAGING_DIR, publishDir, { overwrite: true })
}

export const publishStaticAssets = (publishDir: string) => {
  stageStaticAssets(publishDir)
  promoteStaticAssets(publishDir)
}

export const revertStaticAssets = (publishDir: string) => {
  moveSync('.netlify/.next', publishDir, { overwrite: true })
}
