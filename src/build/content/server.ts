import { copy } from 'fs-extra/esm'
import { globby } from 'globby'

/**
 * Copy App/Pages Router Javascript needed by the server handler
 */
export const copyServerContent = async (src: string, dest: string): Promise<Promise<void>[]> => {
  const paths = await globby([`*`, `server/*`, `server/chunks/*`, `server/+(app|pages)/**/*.js`], {
    cwd: src,
    extglob: true,
  })

  return paths.map((path: string) => copy(`${src}/${path}`, `${dest}/${path}`))
}
