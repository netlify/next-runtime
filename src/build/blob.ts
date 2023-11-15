import { getDeployStore } from '@netlify/blobs'
import type { NetlifyPluginConstants } from '@netlify/build'

export const getBlobStore = ({
  NETLIFY_API_TOKEN,
  NETLIFY_API_HOST,
  SITE_ID,
}: Pick<NetlifyPluginConstants, 'NETLIFY_API_TOKEN' | 'NETLIFY_API_HOST' | 'SITE_ID'>): ReturnType<
  typeof getDeployStore
> => {
  return getDeployStore({
    deployID: process.env.DEPLOY_ID,
    siteID: SITE_ID,
    token: NETLIFY_API_TOKEN,
    apiURL: `https://${NETLIFY_API_HOST}`,
  })
}
