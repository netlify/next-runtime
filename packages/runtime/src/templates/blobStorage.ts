// This file is used on request and build time

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
 * Creates a hash of a string
 * @param key the key we want to create a hash from
 * @returns
 */
export const getHashedKey = (key: string): string => encodeURIComponent(key)

export { Blobs } from '../blob'
