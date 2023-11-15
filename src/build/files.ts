import glob from 'fast-glob'
import { mkdir, symlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export const linkdir = async (src: string, dest: string): Promise<void> => {
  const paths = await glob(['**'], { cwd: src })
  await Promise.all(
    paths.map(async (path) => {
      await mkdir(join(dest, dirname(path)), { recursive: true })
      await symlink(join(src, path), join(dest, path))
    }),
  )
}
