// eslint-disable-next-line n/no-missing-import
import { Blobs } from '@netlify/blobs'

type BlobsInit = ConstructorParameters<typeof Blobs>[0]
let blobsInit: BlobsInit;

// eslint-disable-next-line max-params
export const netliBlob = ( token: string, context: string, siteID: string, contextURL?: string, apiURL?: string ) => {
  blobsInit = {authentication: ({apiURL, token} || {contextURL, token}), context, siteID}
  return new Blobs(blobsInit)
}

export const getBlobInit = () => blobsInit

export const isBlobStorageAvailable = async (blob: Blobs) => {
  try {
    await blob.get('test')
    return true
  } catch {
    return false
  }
}
