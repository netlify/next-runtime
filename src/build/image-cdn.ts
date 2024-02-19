import type { RemotePattern } from 'next/dist/shared/lib/image-config.js'
import { makeRe } from 'picomatch'
import { transform } from 'regexp-tree'

import { PluginContext } from './plugin-context.js'

export function generateRegexFromPattern(pattern: string): string {
  const initialRegex = makeRe(pattern).source
  // resulting regex can contain lookaheads which currently cause problems with Netlify Image CDN remote patterns
  // so we strip them out
  // those regexes seems to be negative lookaheads for "dotfiles" / dots at the beginning of path segments
  // we actually are want to allow them and normally would pass dots: true option to `makeRe` function,
  // but this generally result in even more convoluted regular expression, so we just enable them via
  // stripping lookaheads

  // Parse the regexp into an AST
  const re = transform(new RegExp(initialRegex), {
    Assertion(path) {
      // Remove the lookahead
      if (path.node.kind === 'Lookahead') {
        path.remove()
      }
    },
  })
  // Strip the leading and trailing slashes
  return re.toString().slice(1, -1)
}

/**
 * Rewrite next/image to netlify image cdn
 */
export const setImageConfig = async (ctx: PluginContext): Promise<void> => {
  const {
    images: { domains, remotePatterns, path: imageEndpointPath, loader: imageLoader },
  } = await ctx.buildConfig
  if (imageLoader !== 'default') {
    return
  }

  ctx.netlifyConfig.redirects.push({
    from: imageEndpointPath,
    // w and q are too short to be used as params with id-length rule
    // but we are forced to do so because of the next/image loader decides on their names
    // eslint-disable-next-line id-length
    query: { url: ':url', w: ':width', q: ':quality' },
    to: '/.netlify/images?url=:url&w=:width&q=:quality',
    status: 200,
  })

  if (remotePatterns?.length !== 0 || domains?.length !== 0) {
    ctx.netlifyConfig.images ||= { remote_images: [] }
    ctx.netlifyConfig.images.remote_images ||= []

    if (remotePatterns && remotePatterns.length !== 0) {
      for (const remotePattern of remotePatterns) {
        let { protocol, hostname, port, pathname }: RemotePattern = remotePattern

        if (pathname) {
          pathname = pathname.startsWith('/') ? pathname : `/${pathname}`
        }

        const combinedRemotePattern = `${protocol ?? 'http?(s)'}://${hostname}${
          port ? `:${port}` : ''
        }${pathname ?? '/**'}`

        try {
          ctx.netlifyConfig.images.remote_images.push(
            generateRegexFromPattern(combinedRemotePattern),
          )
        } catch (error) {
          ctx.failBuild(
            `Failed to generate Image CDN remote image regex from Next.js remote pattern: ${JSON.stringify(
              { remotePattern, combinedRemotePattern },
              null,
              2,
            )}`,
            error,
          )
        }
      }
    }

    if (domains && domains.length !== 0) {
      for (const domain of domains) {
        const patternFromDomain = `http?(s)://${domain}/**`
        try {
          ctx.netlifyConfig.images.remote_images.push(generateRegexFromPattern(patternFromDomain))
        } catch (error) {
          ctx.failBuild(
            `Failed to generate Image CDN remote image regex from Next.js domain: ${JSON.stringify(
              { domain, patternFromDomain },
              null,
              2,
            )}`,
            error,
          )
        }
      }
    }
  }
}
