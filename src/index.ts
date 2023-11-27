import type { NetlifyPluginOptions } from '@netlify/build'
import { restoreBuildCache, saveBuildCache } from './build/cache.js'
import { setBuildConfig, setPreBuildConfig } from './build/config.js'
import { uploadPrerenderedContent } from './build/content/prerendered.js'
import {
  copyStaticAssets,
  publishStaticDir,
  unpublishStaticDir,
  uploadStaticContent,
} from './build/content/static.js'
import { createServerHandler } from './build/functions/server.js'

export const onPreBuild = async ({ constants, utils }: NetlifyPluginOptions) => {
  await restoreBuildCache({ constants, utils })
  setPreBuildConfig()
}

export const onBuild = async ({ constants, utils, netlifyConfig }: NetlifyPluginOptions) => {
  await saveBuildCache({ constants, utils })
  setBuildConfig({ netlifyConfig })

  return Promise.all([
    copyStaticAssets({ constants }),
    uploadStaticContent({ constants }),
    uploadPrerenderedContent({ constants }),
    createServerHandler({ constants }),
    // createEdgeHandler(),
  ])
}

export const onPostBuild = async ({ constants }: NetlifyPluginOptions) => {
  await publishStaticDir({ constants })
}

export const onEnd = async ({ constants }: NetlifyPluginOptions) => {
  await unpublishStaticDir({ constants })
}
