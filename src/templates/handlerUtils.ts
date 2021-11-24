import { createWriteStream } from 'fs'
import http from 'http'
import https from 'https'
import { pipeline } from 'stream'
import { promisify } from 'util'

const streamPipeline = promisify(pipeline)

export const downloadFile = async (url: string, destination: string): Promise<void> => {
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

export const getMaxAge = (header: string): number => {
  const parts = header.split(',')
  let maxAge
  for (const part of parts) {
    const [key, value] = part.split('=')
    if (key?.trim() === 's-maxage') {
      maxAge = value?.trim()
    }
  }
  if (maxAge) {
    const result = Number.parseInt(maxAge)
    return Number.isNaN(result) ? 0 : result
  }
  return 0
}

export const getMultiValueHeaders = (
  headers: Record<string, string | Array<string>>,
): Record<string, Array<string>> => {
  const multiValueHeaders: Record<string, Array<string>> = {}
  for (const key of Object.keys(headers)) {
    if (Array.isArray(headers[key])) {
      multiValueHeaders[key] = headers[key] as Array<string>
    } else {
      multiValueHeaders[key] = [headers[key] as string]
    }
  }
  return multiValueHeaders
}
