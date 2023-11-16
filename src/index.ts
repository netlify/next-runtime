import type { NetlifyPluginOptions } from '@netlify/build'
import { restoreBuildCache, saveBuildCache } from './build/cache.js'
import { setBuildConfig, setDeployConfig } from './build/config.js'
import { uploadPrerenderedContent } from './build/content/prerendered.js'
import { copyStaticAssets, uploadStaticContent } from './build/content/static.js'
import { createServerHandler } from './build/functions/server.js'

export const onPreBuild = async ({ constants, utils }: NetlifyPluginOptions) => {
  await restoreBuildCache({ constants, utils })
  setBuildConfig()
}

export const onBuild = async ({ constants, utils }: NetlifyPluginOptions) => {
  await saveBuildCache({ constants, utils })

  return Promise.all([
    copyStaticAssets({ constants }),
    uploadStaticContent({ constants }),
    uploadPrerenderedContent({ constants }),
    createServerHandler({ constants }),
    // createEdgeHandler(),
  ])
}

export const onPostBuild = ({ netlifyConfig }: NetlifyPluginOptions) => {
  setDeployConfig({ netlifyConfig })
}
