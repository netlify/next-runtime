import type { NetlifyPlugin } from '@netlify/build'
import { onPreDev } from './helpers/dev'
import { onPreBuild } from './build/onPreBuild'
import { onBuild } from './build/onBuild'
import { onPostBuild } from './build/onPostBuild'

const plugin: NetlifyPlugin = {
  onPreBuild,
  onBuild,
  onPostBuild,
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
