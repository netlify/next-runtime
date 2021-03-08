const jimp = require('jimp')

// Function used to mimic next/image and sharp
exports.handler = async (event) => {
  const { url, w = 500, q = 75 } = event.queryStringParameters
  const width = parseInt(w)
  const quality = parseInt(q)

  const imageUrl = url.startsWith('/') ? `${process.env.DEPLOY_URL || `http://${event.headers.host}`}${url}` : url
  const image = await jimp.read(imageUrl)

  image.resize(width, jimp.AUTO).quality(quality)

  const imageBuffer = await image.getBufferAsync(image.getMIME())

  return {
    statusCode: 200,
    headers: {
      'Content-Type': image.getMIME(),
    },
    body: imageBuffer.toString('base64'),
    isBase64Encoded: true,
  }
}
