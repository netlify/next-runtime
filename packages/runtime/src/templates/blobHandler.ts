// import { Buffer } from 'node:buffer'
import { env } from 'node:process'

// import type { Blobs } from '@netlify/blobs/dist/src/main'
// import type { Handler, HandlerContext } from '@netlify/functions'

// TODO: memoize this
// TODO: fix any

// eslint-disable-next-line no-new-func
const getBlobStorage = new Function(`
  const  { Blobs } = await import('@netlify/blobs')

  return Blobs
`)

export const setBlobFiles = async ({ NETLIFY_API_HOST, NETLIFY_API_TOKEN, SITE_ID }, filePaths: string[]) => {
  const BlobStorage = await getBlobStorage()
  const blobs = new BlobStorage({
    authentication: {
      apiURL: `https://${NETLIFY_API_HOST}`,
      token: NETLIFY_API_TOKEN,
    },
    context: `deploy:${env.DEPLOY_ID}`,
    siteID: SITE_ID,
  })

  const files = filePaths.map((filePath) => ({ key: filePath, path: filePath }))

  // setFile reads the file path and stores the content within the blob,
  // we set the key with the same file path so we can retrieve the file contents later using the path
  console.dir(files)
  // await blobs.setFiles(files)

  console.log('storing test data in blob storage')
  await blobs.set('test', 'this is test content')
  const data = await blobs.get('test')
  console.log('retrieving test data in blob storage', data)
}

// export const getBlobFile: Handler = async ({ headers, path }, context: HandlerContext) => {
//   const Blobs = await getBlobStorage()
//   const rawData = Buffer.from(context.clientContext.custom.blobs, 'base64')
//   const clientData = JSON.parse(rawData.toString('ascii'))

//   const blobs = new Blobs({
//     authentication: {
//       contextURL: clientData.url,
//       token: clientData.token,
//     },
//     context: `deploy:${headers['x-nf-deploy-id']}`,
//     siteID: headers['x-nf-site-id'],
//   })

//   const value = await blobs.get(path)

//   return {
//     statusCode: 200,
//     headers: {
//       'Content-type': 'text/html; charset=UTF-8',
//     },
//     body: value,
//   }
// }
