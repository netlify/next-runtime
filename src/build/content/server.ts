import { globby } from 'globby'
import { existsSync } from 'node:fs'
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/**
 * Copy App/Pages Router Javascript needed by the server handler
 */
export const copyServerContent = async (src: string, dest: string): Promise<void> => {
  const paths = await globby([`*`, `server/*`, `server/chunks/*`, `server/+(app|pages)/**/*.js`], {
    cwd: src,
    extglob: true,
  })

  await Promise.all(
    paths.map(async (path: string) => {
      const srcPath = join(src, path)
      const destPath = join(dest, path)

      if (!existsSync(srcPath)) {
        throw new Error(`Source file does not exist: ${srcPath}`)
      }

      await mkdir(dirname(destPath), { recursive: true })
      await copyFile(srcPath, destPath)
    }),
  )
}
