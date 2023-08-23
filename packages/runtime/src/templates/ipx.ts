/* eslint-disable import/no-unresolved, @typescript-eslint/ban-ts-comment  */
import { Handler } from '@netlify/functions'
import { createIPXHandler } from '@netlify/ipx'

// @ts-ignore Injected at build time
import { basePath, domains, remotePatterns, responseHeaders } from './imageconfig.json'

export const handler: Handler = createIPXHandler({
  basePath,
  // domains, commenting out for now
  remotePatterns,
  responseHeaders,
}) as Handler
/* eslint-enable import/no-unresolved, @typescript-eslint/ban-ts-comment  */
