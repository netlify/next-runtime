// This file is used on request and build time

import { Blobs as IBlobs } from '@netlify/blobs/dist/src/main'

let blobs: IBlobs

export const getBlobStorage = async ({
  apiHost,
  token,
  siteID,
  deployId,
}: {
  apiHost: string
  token: string
  siteID: string
  deployId: string
}) => {
  // eslint-disable-next-line no-new-func
  const blobFunction = new Function(`
    return import('@netlify/blobs')
`)

  if (!blobs) {
    const { Blobs } = await blobFunction()
    blobs = new Blobs({
      authentication: {
        apiURL: apiHost.startsWith('http') ? apiHost : `https://${apiHost}`,
        token,
      },
      context: `deploy:${deployId}`,
      siteID,
    })
  }

  return blobs
}

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
