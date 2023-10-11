import { readFileSync } from 'fs'

import type { NetlifyConfig } from '@netlify/build'
import { copySync, moveSync } from 'fs-extra/esm'

import { __dirname, NETLIFY_PUBLISH_DIR, NETLIFY_TEMP_DIR } from './constants.js'

/**
 * Modify the user's next.config.js to use standalone mode and cache handler
 */
export const modifyNextConfig = () => {
  // revert any previous changes
  revertNextConfig()

  // backup config and replace with our own
  moveSync('next.config.js', `${NETLIFY_TEMP_DIR}/next.config.js`)
  copySync(`${__dirname}/../templates/next.config.cjs`, 'next.config.js')
}

export const revertNextConfig = () => {
  // check if modified, then revert
  if (readFileSync('next.config.js').includes('Netlify generated code')) {
    moveSync(`${NETLIFY_TEMP_DIR}/next.config.js`, 'next.config.js', { overwrite: true })
  }
}

/**
 * Modify the user's netlify.toml to use our new publish directory
 * @param config Netlify config
 */
export const modifyNetlifyConfig = (config: NetlifyConfig) => {
  config.build.publish = NETLIFY_PUBLISH_DIR
}
