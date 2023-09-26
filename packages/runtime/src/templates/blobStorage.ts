import { Buffer } from 'buffer'

import { Blobs as IBlobs } from '@netlify/blobs/dist/src/main'

export type BlobISRPage = {
  value: string
  headers: Record<string, string>
  lastModified: number
}

export const isBlobStorageAvailable = async (netliBlob: IBlobs) => {
  try {
    // request a key that is not present. If it returns `null` then the blob storage is available
    // if it throws it's not available.
    await netliBlob.get('any-key')
    return true
  } catch (error) {
    console.log('BLOB error', error)
    return false
  }
}

/**
 * @netlify/blobs ATM has some limitation to keys, so we need to normalize it for now (they will be resolved so we will be able to remove this code)
 */
export const getNormalizedBlobKey = (key: string): string => Buffer.from(key).toString('base64url')

export { Blobs } from '../blob'
