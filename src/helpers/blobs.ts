import { getStore } from '@netlify/blobs'

export const netliBlob = (token: string, deployID: string, siteID: string, apiURL?: string) => {
  const storeAuth = { deployID, siteID, token, apiURL }
  // apiURL uses default on build so we only preserve context if apiURL is set within handler function
  if (apiURL) {
    process.env.NETLIFY_BLOBS_CONTEXT = btoa(JSON.stringify(storeAuth))
  }
  return getStore(storeAuth)
}
