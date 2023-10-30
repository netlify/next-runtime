import { NetlifyPluginConstants, NetlifyPluginUtils } from '@netlify/build'
import { ensureDir, move, pathExists } from 'fs-extra/esm'
import { BUILD_DIR } from './constants.js'

/**
 * Move the Next.js build output from the publish dir to a temp dir
 */
export const moveBuildOutput = async (
  { PUBLISH_DIR }: NetlifyPluginConstants,
  utils: NetlifyPluginUtils,
): Promise<void> => {
  if (!(await pathExists(PUBLISH_DIR))) {
    utils.build.failBuild(
      'Your publish directory does not exist. Please check your netlify.toml file.',
    )
  }

  // move the build output to a temp dir
  await move(PUBLISH_DIR, `${BUILD_DIR}/.next`, { overwrite: true })

  // recreate the publish dir so we can move the static content back
  await ensureDir(PUBLISH_DIR)
}
