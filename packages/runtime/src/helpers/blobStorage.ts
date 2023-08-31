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
