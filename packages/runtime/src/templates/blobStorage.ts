// This file is used on request and build time

import { Blobs as IBlobs } from '@netlify/blobs/dist/src/main'

import { Blobs } from '../blob'

export const getBlobStorage = ({
  contextURL,
  apiHost,
  token,
  siteID,
  deployId,
}: {
  contextURL?: string
  apiHost?: string
  token: string
  siteID: string
  deployId: string
}) =>
  new Blobs({
    authentication: {
      contextURL,
      apiURL: `https://${apiHost}`,
      token,
    },
    context: `deploy:${deployId}`,
    siteID,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any) as unknown as IBlobs

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

export {}
