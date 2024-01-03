import type { NetlifyPluginOptions } from '@netlify/build'
import { restoreBuildCache, saveBuildCache } from './build/cache.js'
import { setPreBuildConfig, verifyBuildConfig } from './build/config.js'
import { copyFetchContent, copyPrerenderedContent } from './build/content/prerendered.js'
import {
  copyStaticAssets,
  copyStaticContent,
  publishStaticDir,
  unpublishStaticDir,
} from './build/content/static.js'
import { createEdgeHandlers } from './build/functions/edge.js'
import { createServerHandler } from './build/functions/server.js'

export const onPreBuild = async ({ constants, utils }: NetlifyPluginOptions) => {
  setPreBuildConfig()
  await restoreBuildCache({ constants, utils })
}

export const onBuild = async ({ constants, utils }: NetlifyPluginOptions) => {
  verifyBuildConfig({ constants, utils })
  await saveBuildCache({ constants, utils })

  await Promise.all([
    copyStaticAssets({ constants, utils }),
    copyStaticContent({ constants, utils }),
    copyPrerenderedContent({ constants, utils }),
    copyFetchContent({ constants, utils }),
    createServerHandler({ constants }),
    createEdgeHandlers({ constants }),
  ])
}

export const onPostBuild = async ({ constants, utils }: NetlifyPluginOptions) => {
  await publishStaticDir({ constants, utils })
}

export const onEnd = async ({ constants }: NetlifyPluginOptions) => {
  await unpublishStaticDir({ constants })
}
