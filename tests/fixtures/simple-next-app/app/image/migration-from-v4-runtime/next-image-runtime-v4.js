// Moved to separate component marked with "use client" to avoid the following error when attempting to do similar on page itself
// Error: Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server".
//   {0: ..., loader: function}

'use client'

import Image from 'next/image'

function RuntimeV4SimulatorImageLoader({ src, width, quality }) {
  // replicate default Next.js image loader, just using custom endpoint that will simulate the runtime V4 behavior
  // https://github.com/vercel/next.js/blob/c9439b5654432df6488e178e5ade6f4ad2d1cf6a/packages/next/src/shared/lib/image-loader.ts#L60
  return `/_nextRuntimeV4ImageHandler?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`
}

export function NextImageWithLoaderSimulatingRuntimeV4(props) {
  return <Image {...props} loader={RuntimeV4SimulatorImageLoader} />
}
