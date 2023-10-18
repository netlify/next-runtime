import { Buffer } from 'buffer'

import { getStore } from '@netlify/blobs'

export const netliBlob = (token: string, deployID: string, siteID: string, apiURL?: string ) => {
  const storeAuth = {deployID, siteID, token, apiURL}
  // apiURL uses default on build so we only preserve context if apiURL is set within handler function
  if ( apiURL ){
    process.env.NETLIFY_BLOBS_CONTEXT = btoa(JSON.stringify(storeAuth))
  }
  return getStore(storeAuth)
}

export const isBlobStorageAvailable = async (blob: any) => {
  try {
    await blob.get('test-blob')
    return true
  } catch {
    return false
  }
}

/**
 * @netlify/blobs ATM has some limitation to keys, so we need to normalize it for now (they will be resolved so we will be able to remove this code)
 */
export const getNormalizedBlobKey = (key: string): string => Buffer.from(key).toString('base64url')
