import { NetlifyConfig } from '@netlify/build'

/**
 * Enable Next.js standalone mode at build time
 */
export const setBuildConfig = (netlifyConfig: NetlifyConfig) => {
  process.env.NEXT_PRIVATE_STANDALONE = 'true'
  netlifyConfig.redirects ||= []
  netlifyConfig.redirects.push({
    from: '/*',
    to: '/.netlify/functions/___netlify-server-handler',
    status: 200,
  })
}
