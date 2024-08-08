// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getHandler } from 'https://ipx-edge-function-layer.netlify.app/mod.ts'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Injected at build time
import imageconfig from './imageconfig.json' assert { type: 'json' }

export default getHandler({
  formats: imageconfig?.formats,
  basePath: imageconfig?.basePath,
  imageCDNCompat: true,
})
