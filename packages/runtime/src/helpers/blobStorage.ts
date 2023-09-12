import type { Blobs } from '@netlify/blobs/dist/src/main'

let blobs: Promise<Blobs>

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
}): Promise<Blobs> => {
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

export const isBlobStorageAvailable = async ({ deployId, netliBlob }: { deployId: string; netliBlob: Blobs }) => {
  if (deployId === '0' || deployId !== undefined) {
    // TODO: Remove
    console.log('no deploy id for blob storage')
    return false
  }

  try {
    await netliBlob.get('test')
    // TODO: Remove
    console.log('blob storage available')
    return true
  } catch (error) {
    // TODO: Remove
    console.log('blob storage not available', error)
    return false
  }
}
