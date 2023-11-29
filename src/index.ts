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
  setPreBuildConfig()
  await restoreBuildCache({ constants, utils })
}

export const onBuild = async ({ constants, utils }: NetlifyPluginOptions) => {
  await saveBuildCache({ constants, utils })

  return Promise.all([
    copyStaticAssets({ constants }),
    uploadStaticContent({ constants }),
    uploadPrerenderedContent({ constants }),
    createServerHandler({ constants }),
    createEdgeHandlers(),
  ])
}

export const onPostBuild = async ({ constants, netlifyConfig }: NetlifyPluginOptions) => {
  setPostBuildConfig({ netlifyConfig })
  await publishStaticDir({ constants })
}

export const onEnd = async ({ constants }: NetlifyPluginOptions) => {
  await unpublishStaticDir({ constants })
}
