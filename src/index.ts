import type { NetlifyPluginOptions } from '@netlify/build'
import { restoreBuildCache, saveBuildCache } from './build/cache.js'
import { setPostBuildConfig, setPreBuildConfig } from './build/config.js'
import { uploadPrerenderedContent } from './build/content/prerendered.js'
import {
  copyStaticAssets,
  publishStaticDir,
  unpublishStaticDir,
  uploadStaticContent,
} from './build/content/static.js'
import { createServerHandler } from './build/functions/server.js'
import { createEdgeHandlers } from './build/functions/edge.js'

export const onPreBuild = async ({ constants, utils }: NetlifyPluginOptions) => {
  await restoreBuildCache({ constants, utils })
  setPreBuildConfig()
}

export const onBuild = async ({ constants, utils }: NetlifyPluginOptions) => {
  await saveBuildCache({ constants, utils })

  await Promise.all([
    copyStaticAssets({ constants }),
    uploadStaticContent({ constants }),
    uploadPrerenderedContent({ constants }),
    createServerHandler({ constants }),
    createEdgeHandlers(),
  ])
}

export const onPostBuild = async ({ constants, netlifyConfig }: NetlifyPluginOptions) => {
  await publishStaticDir({ constants })
  setPostBuildConfig({ netlifyConfig })
}

export const onEnd = async ({ constants }: NetlifyPluginOptions) => {
  await unpublishStaticDir({ constants })
}
