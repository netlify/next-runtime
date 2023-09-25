import { copySync, moveSync } from 'fs-extra/esm'

import { __dirname } from './constants.js'

export const overrideNextJsConfig = () => {
  moveSync('next.config.js', 'next.config.js.orig')
  copySync(`${__dirname}/../templates/next.config.cjs`, 'next.config.js')
}

export const revertNextJsConfig = () => {
  moveSync('next.config.js.orig', 'next.config.js', { overwrite: true })
}
