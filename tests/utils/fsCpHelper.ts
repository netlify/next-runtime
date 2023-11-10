import { readdirSync, existsSync, mkdirSync, statSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'

export function fsCpHelper(sourceDir: string, targetDir: string, options): void {
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir)
  }

  const files = readdirSync(sourceDir)

  for (const file of files) {
    const sourceFilePath = join(sourceDir, file)
    const targetFilePath = join(targetDir, file)

    if (statSync(sourceFilePath).isDirectory()) {
      fsCpHelper(sourceFilePath, targetFilePath, options)
    } else {
      copyFileSync(sourceFilePath, targetFilePath)
    }
  }
}
