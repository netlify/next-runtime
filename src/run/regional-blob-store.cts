import { getDeployStore, Store } from '@netlify/blobs'

const fetchBeforeNextPatchedIt = globalThis.fetch

export const getRegionalBlobStore = (args: Parameters<typeof getDeployStore>[0] = {}): Store => {
  return getDeployStore({
    ...args,
    fetch: fetchBeforeNextPatchedIt,
    experimentalRegion:
      process.env.USE_REGIONAL_BLOBS?.toUpperCase() === 'TRUE' ? 'context' : undefined,
  })
}
