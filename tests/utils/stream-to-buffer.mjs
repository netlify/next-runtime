// @ts-check

/**
 * Converts a readable stream to a buffer
 * @param stream {NodeJS.ReadableStream} Node.js Readable stream
 * @returns {Promise<Buffer>}
 */
export function streamToBuffer(stream) {
  /** @type {Buffer[]} */
  const chunks = []

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on('error', (err) => reject(err))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
  })
}
