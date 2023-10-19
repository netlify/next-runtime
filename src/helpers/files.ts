import { NetlifyPluginConstants } from '@netlify/build'
import { copy, move, remove } from 'fs-extra/esm'
import { globby } from 'globby'

import { BUILD_DIR } from './constants.js'

/**
 * Move the Next.js build output from the publish dir to a temp dir
 */
export const stashBuildOutput = async ({ PUBLISH_DIR }: NetlifyPluginConstants) => {
  await move(PUBLISH_DIR, `${BUILD_DIR}/.next`, { overwrite: true })

  // remove prerendered content from the standalone build (it's also in the main build dir)
  await Promise.all(
    getPrerenderedContent(`${BUILD_DIR}/.next/standalone/`).map((filename: string) =>
      remove(filename),
    ),
  )
}

/**
 * Glob for prerendered content in the build output
 */
const getPrerenderedContent = (cwd: string): string[] => {
  // TODO: test this
  // return globby('**/*.+(html|json|rsc|body|meta)', { cwd, extglob: true })
  return []
}

/**
 * Upload prerendered content from the main build dir to the blob store
 */
export const storePrerenderedContent = () => {
  // TODO: implement
}

/**
 * Move static assets to the publish dir so they are uploaded to the CDN
 */
export const publishStaticAssets = ({ PUBLISH_DIR }: NetlifyPluginConstants) => {
  return Promise.all([
    copy('public', PUBLISH_DIR),
    copy(`${BUILD_DIR}/.next/static/`, `${PUBLISH_DIR}/_next/static`),
  ])
}
