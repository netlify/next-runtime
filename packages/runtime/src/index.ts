import type { NetlifyPlugin } from '@netlify/build'

import { onBuild } from './build/onBuild'
import { onEnd } from './build/onEnd'
import { onPostBuild } from './build/onPostBuild'
import { onPreBuild } from './build/onPreBuild'
import { onPreDev } from './build/onPreDev'

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
      onEnd
    }
  }
  return {
    ...plugin,
    onPreDev,
  }
}

module.exports = nextRuntime
