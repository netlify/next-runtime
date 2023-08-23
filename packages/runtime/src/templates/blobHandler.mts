import { Buffer } from 'node:buffer'
import { env } from 'node:process'

import { Blobs } from '@netlify/blobs'
import { Handler, HandlerContext } from '@netlify/functions'

export const setBlobFiles = async ({ NETLIFY_API_HOST, NETLIFY_API_TOKEN, SITE_ID }, filePaths: string[]) => {
  const blobs = new Blobs({
    authentication: {
      apiURL: `https://${NETLIFY_API_HOST}`,
      token: NETLIFY_API_TOKEN,
    },
    context: `deploy:${env.DEPLOY_ID}`,
    siteID: SITE_ID,
  })

  // const files = filePaths.map((filePath) => ({ key: filePath, path: filePath }))

  // // setFile reads the file path and stores the content within the blob,
  // // we set the key with the same file path so we can retrieve the file contents later using the path
  // await blobs.setFiles(files)

  await blobs.set('testing', 'set')

  console.log('SSR Files are now in the blob', { blobs })
}

// export const getBlobFile: Handler = async ({ headers, path }, context: HandlerContext) => {
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
