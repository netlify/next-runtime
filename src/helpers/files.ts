import { existsSync } from 'node:fs'

import { moveSync } from 'fs-extra/esm'

export const publishStaticAssets = (publishDir: string) => {
  moveSync(publishDir, `${publishDir}.orig`)
  if (existsSync('public')) {
    moveSync('public', publishDir)
  }
  moveSync(`${publishDir}.orig/static/`, `${publishDir}/_next/static`)
}

export const revertStaticAssets = (publishDir: string) => {
  moveSync(`${publishDir}.orig`, publishDir, { overwrite: true })
}
