import { NetlifyConfig } from '@netlify/build'
import type { RemotePattern } from 'next/dist/shared/lib/image-config'

import { getImageManifest } from './config'

/**
 * Rewrite next/image to netlify image cdn
 */
export const setImageConfig = async (netlifyConfig: NetlifyConfig): Promise<void> => {
  const { domains, remotePatterns, loader, path: imagePath } = await getImageManifest(netlifyConfig.build.publish)

  if (loader !== 'default') {
    return
  }

  netlifyConfig.redirects.push({
    from: imagePath,
    query: { url: ':url', w: ':width', q: ':quality' },
    to: '/.netlify/images?url=:url&w=:width&q=:quality',
    status: 200,
  })

  let remoteImage

  if (remotePatterns?.length !== 0 || domains?.length !== 0) {
    netlifyConfig.images ||= { remote_images: [] }
    netlifyConfig.images.remote_images ||= []

    if (remotePatterns?.length !== 0) {
      for (const remotePattern of remotePatterns) {
        let { protocol, hostname, port, pathname }: RemotePattern = remotePattern

        if (pathname) {
          pathname = pathname.startsWith('/') ? pathname : `/${pathname}`
        }

        port = port ? `:${port}` : ''
        remoteImage = `${protocol ?? 'https?'}://${hostname}${port}${pathname || ''}`

        netlifyConfig.images.remote_images.push(remoteImage)
      }
    }

    if (domains?.length !== 0) {
      for (const domain of domains) {
        netlifyConfig.images.remote_images.push(`https?://${domain.replace('.', '\\.')}/.*`)
      }
    }
  }
}
