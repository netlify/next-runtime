import type { Blobs } from '@netlify/blobs/dist/src/main'

import { memoize } from './memoize'

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
  }): Promise<Blobs> => {
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

    return blobs as Promise<Blobs>
  },
)
