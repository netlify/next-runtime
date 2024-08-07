import { createIPXHandler } from '@netlify/ipx'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Injected at build time
import { basePath, domains, remotePatterns } from './imageconfig.json'

export const handler = createIPXHandler({
  basePath,
  domains,
  remotePatterns,
})
