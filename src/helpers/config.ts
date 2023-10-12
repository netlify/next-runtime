import { readFileSync } from 'fs'

import type { NetlifyConfig } from '@netlify/build'
import { copySync, moveSync } from 'fs-extra/esm'

import { MODULE_DIR, NETLIFY_PUBLISH_DIR, NETLIFY_TEMP_DIR } from './constants.js'

/**
 * Modify the user's next.config.js to use standalone mode and cache handler
 */
export const modifyNextConfig = () => {
  // revert any previous changes
  revertNextConfig()

  // TODO: find a better way to do this because there's a ton of different ways
  // to configure next.config.js and the user could be using any of them
  // https://github.com/netlify/next-runtime-minimal/issues/12
  moveSync('next.config.js', `${NETLIFY_TEMP_DIR}/next.config.js`)
  copySync(`${MODULE_DIR}/../templates/build/next-config.cjs`, 'next.config.js')
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
  // TODO: once onEnd is fixed, we can remove this
  // https://github.com/netlify/cli/issues/6050
  config.build.publish = NETLIFY_PUBLISH_DIR
}
