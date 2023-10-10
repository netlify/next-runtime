import { Buffer } from 'buffer'

import { Blobs as IBlobs } from '@netlify/blobs'

import { Blobs as untypedBlobs } from './blob'

const Blobs = untypedBlobs as unknown as typeof IBlobs

export const isBlobStorageAvailable = async (netliBlob: IBlobs) => {
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

export { Blobs }
