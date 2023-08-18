import { copySync, moveSync } from 'fs-extra'

export const overrideNextJsConfig = () => {
  copySync('next.config.js', '.netlify/next.config.js', { overwrite: true })
  copySync(`${__dirname}/../templates/next.config.js`, 'next.config.js')
}

export const revertNextJsConfig = () => {
  moveSync('.netlify/next.config.js', 'next.config.js', { overwrite: true })
}
