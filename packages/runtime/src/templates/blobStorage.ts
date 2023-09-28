import { Buffer } from 'buffer'

import { Blobs as IBlobs } from '@netlify/blobs/dist/src/main'

import { Blobs as untypedBlobs } from './blob'

const Blobs = untypedBlobs as unknown as typeof IBlobs

type AssetType = 'html' | 'json' | 'rsc'

export type BlobISRPage = {
  value: string
  type: AssetType
  lastModified: number
  ttl: number
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

export const getHeaderForType = (type: AssetType): Record<string, string> => {
  switch (type) {
    case 'html':
      return {
        'content-type': 'text/html; charset=utf-8',
      }
    case 'json':
      return {
        'content-type': 'application/json; charset=utf-8',
      }
    case 'rsc':
      return {
        'content-type': 'text/x-component',
      }
    default:
      return {}
  }
}

/**
 * @netlify/blobs ATM has some limitation to keys, so we need to normalize it for now (they will be resolved so we will be able to remove this code)
 */
export const getNormalizedBlobKey = (key: string): string => Buffer.from(key).toString('base64url')

export { Blobs }
