import type { NetlifyPlugin } from '@netlify/build'
import { onPreDev } from './helpers/dev'
import { preBuildHandler } from './build/preBuildHandler'
import { buildHandler } from './build/buildHandler'
import { postBuildHandler } from './build/postBuildHandler'

const plugin: NetlifyPlugin = {
  onPreBuild: preBuildHandler,
  onBuild: buildHandler,
  onPostBuild: postBuildHandler,
}
// The types haven't been updated yet
const nextRuntime = (
  _inputs,
  meta: { events?: Set<string> } = {},
): NetlifyPlugin & { onPreDev?: NetlifyPlugin['onPreBuild'] } => {
  if (!meta?.events?.has('onPreDev')) {
    return {
      ...plugin,
      onEnd: ({ utils }) => {
        utils.status.show({
          title: 'Please upgrade to the latest version of the Netlify CLI',
          summary:
            'To support for the latest Next.js features, please upgrade to the latest version of the Netlify CLI',
        })
      },
    }
  }
  return {
    ...plugin,
    onPreDev,
  }
}

module.exports = nextRuntime
