import { getDeployStore, GetWithMetadataOptions, Store } from '@netlify/blobs'

const fetchBeforeNextPatchedIt = globalThis.fetch

export const getRegionalBlobStore = (args: GetWithMetadataOptions = {}): Store => {
  return getDeployStore({
    ...args,
    fetch: fetchBeforeNextPatchedIt,
    region: process.env.USE_REGIONAL_BLOBS?.toUpperCase() === 'TRUE' ? undefined : 'us-east-2',
  })
}
