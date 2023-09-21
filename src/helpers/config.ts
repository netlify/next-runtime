import { copySync, moveSync, removeSync } from 'fs-extra/esm'

import { __dirname } from './constants.js'

export const overrideNextJsConfig = () => {
  copySync('next.config.js', '.netlify/next.config.js', { overwrite: true })
  copySync(`${__dirname}/../templates/next.config.cjs`, 'next.config.js')
  copySync(`${__dirname}/../templates/cache-handler.cjs`, 'cache-handler.js')
}

export const revertNextJsConfig = () => {
  moveSync('.netlify/next.config.js', 'next.config.js', { overwrite: true })
  removeSync('cache-handler.js')
}
