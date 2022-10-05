/* eslint-disable n/no-missing-import, import/no-unresolved, @typescript-eslint/ban-ts-comment  */
import { Handler } from '@netlify/functions'
import { createIPXHandler } from '@netlify/ipx'

// @ts-ignore Injected at build time
import { basePath, domains, remotePatterns, responseHeaders } from './imageconfig.json'

export const handler: Handler = createIPXHandler({
  basePath,
  domains,
  remotePatterns,
  responseHeaders,
  localPrefix: '/_next/static/media/',
}) as Handler
/* eslint-enable n/no-missing-import, import/no-unresolved, @typescript-eslint/ban-ts-comment  */
