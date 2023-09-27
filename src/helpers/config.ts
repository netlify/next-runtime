import type { NetlifyConfig } from '@netlify/build'
import { copySync, moveSync } from 'fs-extra/esm'

import { __dirname, NETLIFY_PUBLISH_DIR } from './constants.js'

/**
 * Modify the user's next.config.js to use standalone mode
 */
export const modifyNextConfig = () => {
  moveSync('next.config.js', 'next.config.js.orig')
  copySync(`${__dirname}/../templates/next.config.cjs`, 'next.config.js')
}

export const revertNextConfig = () => {
  moveSync('next.config.js.orig', 'next.config.js', { overwrite: true })
}

/**
 * Modify the user's netlify.toml to use our new publish directory
 * @param config Netlify config
 */
export const modifyNetlifyConfig = (config: NetlifyConfig) => {
  config.build.publish = NETLIFY_PUBLISH_DIR
}
