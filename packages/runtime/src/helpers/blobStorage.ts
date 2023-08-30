import { memoize } from './memoize'

// TODO: fix any and get the BlobStorage type somehow in a non-ESM way
export const getBlobStorage = memoize(
  async ({
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

    const { Blobs } = await blobFunction()
    const blobs = new Blobs({
      authentication: {
        apiURL: `https://${apiHost}`,
        token,
      },
      context: `deploy:${deployId}`,
      siteID,
    })

    return blobs
  },
)
