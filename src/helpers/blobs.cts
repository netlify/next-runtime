import { getStore } from '@netlify/blobs'

export const netliBlob = (token: string, deployID: string, siteID: string, apiURL?: string ) => {
  return getStore({
    deployID,
    siteID,
    token,
    apiURL
  })
}

export const isBlobStorageAvailable = async (blob) => {
  try {
    await blob.get('test-blob')
    return true
  } catch {
    return false
  }
}
