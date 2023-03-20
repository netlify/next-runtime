import type { NetlifyPlugin } from '@netlify/build'
import { onPreDev } from './build/onPreDev'
import { onPreBuild } from './build/onPreBuild'
import { onBuild } from './build/onBuild'
import { onPostBuild } from './build/onPostBuild'
import { onEnd } from './build/onEnd'

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
