import { createWriteStream } from 'fs'
import http from 'http'
import https from 'https'
import { pipeline } from 'stream'
import { promisify } from 'util'

const streamPipeline = promisify(pipeline)

export const downloadFile = async (url, destination) => {
  console.log(`Downloading ${url} to ${destination}`)

  const httpx = url.startsWith('https') ? https : http

  await new Promise((resolve, reject) => {
    const req = httpx.get(url, { timeout: 10000 }, (response) => {
      if (response.statusCode < 200 || response.statusCode > 299) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode} ${response.statusMessage || ''}`))
        return
      }
      const fileStream = createWriteStream(destination)
      streamPipeline(response, fileStream)
        .then(resolve)
        .catch((error) => {
          console.log(`Error downloading ${url}`, error)
          reject(error)
        })
    })
    req.on('error', (error) => {
      console.log(`Error downloading ${url}`, error)
      reject(error)
    })
  })
}
