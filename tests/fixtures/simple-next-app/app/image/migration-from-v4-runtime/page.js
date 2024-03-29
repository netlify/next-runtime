import { NextImageWithLoaderSimulatingRuntimeV4 } from './next-image-runtime-v4'

export default function NextImageUsingNetlifyImageCDN() {
  return (
    <main>
      <h1>Next/Image + Netlify Image CDN</h1>
      <NextImageWithLoaderSimulatingRuntimeV4
        src="/squirrel.jpg"
        alt="a cute squirrel (next/image)"
        width={300}
        height={278}
      />
    </main>
  )
}
