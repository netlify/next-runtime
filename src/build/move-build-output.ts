import { NetlifyPluginConstants, NetlifyPluginUtils } from '@netlify/build'
import { existsSync } from 'node:fs'
import { mkdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { REL_BUILD_DIR } from './constants.js'

/**
 * Move the Next.js build output from the publish dir to a temp dir
 */
export const moveBuildOutput = async (
  { PUBLISH_DIR }: Pick<NetlifyPluginConstants, 'PUBLISH_DIR'>,
  utils: NetlifyPluginUtils,
): Promise<void> => {
  if (!existsSync(PUBLISH_DIR)) {
    utils.build.failBuild(
      'Your publish directory does not exist. Please check your netlify.toml file.',
    )
  }

  const tempDir = join(process.cwd(), REL_BUILD_DIR, '.next')

  try {
    // cleanup any existing directory
    await rm(tempDir, { force: true, recursive: true })
    await mkdir(tempDir, { recursive: true })
    // move the build output to a temp dir
    await rename(PUBLISH_DIR, tempDir)
  } catch (error) {
    if (error instanceof Error) {
      utils.build.failBuild(`Error moving the build output to the temp directory`, { error })
    }
  }

  try {
    // recreate the publish dir so we can move the static content back
    await mkdir(PUBLISH_DIR, { recursive: true })
  } catch (error) {
    if (error instanceof Error) {
      utils.build.failBuild(`Error recreating publish directory`, { error })
    }
  }
}
