import glob from 'fast-glob'
import { mkdir, symlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/**
 * Copy App/Pages Router Javascript needed by the server handler
 */
export const linkServerContent = async (src: string, dest: string): Promise<void> => {
  const paths = await glob([`*`, `server/*`, `server/chunks/*`, `server/+(app|pages)/**/*.js`], {
    cwd: src,
    extglob: true,
  })
  await Promise.all(
    paths.map(async (path: string) => {
      await mkdir(join(dest, dirname(path)), { recursive: true })
      await symlink(join(src, path), join(dest, path))
    }),
  )
}

export const linkServerDependencies = async (src: string, dest: string): Promise<void> => {
  const paths = await glob([`**`], {
    cwd: src,
    extglob: true,
  })
  await Promise.all(
    paths.map(async (path: string) => {
      await mkdir(join(dest, dirname(path)), { recursive: true })
      await symlink(join(src, path), join(dest, path))
    }),
  )
}
