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
