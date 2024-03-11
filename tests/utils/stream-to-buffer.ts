/**
 * Converts a readable stream to a buffer
 * @param stream Node.js Readable stream
 * @returns
 */
export function streamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = []

  return new Promise<Buffer>((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on('error', (err) => reject(err))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
  })
}
