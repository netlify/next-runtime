import { Blobs } from '@netlify/blobs'
import type { Blobs as IBlobs } from '@netlify/blobs'

let blobs: IBlobs

export const getBlobStorage = ({
  apiHost,
  token,
  siteID,
  deployId,
}: {
  apiHost: string | undefined
  token: string | undefined
  siteID: string
  deployId: string | undefined
}) => {
  if (!blobs && apiHost && token && siteID && deployId) {
    blobs = new Blobs({
      authentication: {
        apiURL: `https://${apiHost}`,
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
    await netliBlob.get('test')
    return true
  } catch {
    return false
  }
}
