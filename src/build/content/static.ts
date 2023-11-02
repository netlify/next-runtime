import { NetlifyPluginConstants } from '@netlify/build'
import { copy, pathExists } from 'fs-extra/esm'
import { globby } from 'globby'
import { ParsedPath, parse } from 'node:path'
import { BUILD_DIR, WORKING_DIR } from '../constants.js'

/**
 * Copy static pages (HTML without associated JSON data)
 */
const copyStaticPages = async (src: string, dest: string): Promise<Promise<void>[]> => {
  const paths = await globby([`server/pages/**/*.+(html|json)`], {
    cwd: src,
    extglob: true,
  })

  return (
    paths
      .map(parse)
      // keep only static files that do not have JSON data
      .filter(({ dir, name }: ParsedPath) => !paths.includes(`${dir}/${name}.json`))
      .map(({ dir, base }: ParsedPath) =>
        copy(`${src}/${dir}/${base}`, `${dest}/${dir.replace(/^server\/(app|pages)/, '')}/${base}`),
      )
  )
}

/**
 * Move static content to the publish dir so it is uploaded to the CDN
 */
export const copyStaticContent = async ({ PUBLISH_DIR }: NetlifyPluginConstants): Promise<void> => {
  await Promise.all([
    // static pages
    Promise.all(await copyStaticPages(`${BUILD_DIR}/.next`, PUBLISH_DIR)),
    // static assets
    copy(`${BUILD_DIR}/.next/static/`, `${PUBLISH_DIR}/_next/static`),
    // public assets
    (await pathExists(`${WORKING_DIR}/public/`)) && copy(`${WORKING_DIR}/public/`, PUBLISH_DIR),
  ])
}
