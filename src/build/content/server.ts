import glob from 'fast-glob'
import { cp } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Copy App/Pages Router Javascript needed by the server handler
 */
export const copyServerContent = async (src: string, dest: string): Promise<void> => {
  const paths = await glob([`*`, `server/*`, `server/chunks/*`, `server/+(app|pages)/**/*.js`], {
    cwd: src,
    extglob: true,
  })
  await Promise.all(
    paths.map(async (path: string) => {
      await cp(join(src, path), join(dest, path), { recursive: true })
    }),
  )
}

export const copyServerDependencies = async (src: string, dest: string): Promise<void> => {
  const paths = await glob([`**`], {
    cwd: src,
    extglob: true,
  })
  await Promise.all(
    paths.map(async (path: string) => {
      await cp(join(src, path), join(dest, path), { recursive: true })
    }),
  )
}
