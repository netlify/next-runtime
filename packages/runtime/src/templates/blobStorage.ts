import { Buffer } from 'buffer'

import { Blobs } from '@netlify/blobs'

export const isBlobStorageAvailable = async (netliBlob: Blobs) => {
  try {
    // request a key that is not present. If it returns `null` then the blob storage is available
    // if it throws it's not available.
    await netliBlob.get('any-key')
    return true
  } catch {
    return false
  }
}

type BlobsInit = ConstructorParameters<typeof Blobs>[0]

let blobInit: BlobsInit
export const setBlobInit = (init: BlobsInit): void => {
  blobInit = init
}
export const getBlobInit = (): BlobsInit => blobInit

/**
 * @netlify/blobs ATM has some limitation to keys, so we need to normalize it for now (they will be resolved so we will be able to remove this code)
 */
export const getNormalizedBlobKey = (key: string): string => Buffer.from(key).toString('base64url')

// eslint-disable-next-line unicorn/prefer-export-from -- we are both using and re-exporting Blobs here for simplicity of importing Blobs and our helpers from same module
export { Blobs }
