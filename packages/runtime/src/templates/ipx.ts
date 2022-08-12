/* eslint-disable n/no-missing-import, import/no-unresolved, @typescript-eslint/ban-ts-comment  */
import { Handler } from '@netlify/functions'
import { createIPXHandler } from '@netlify/ipx'

// @ts-ignore Injected at build time
import { basePath, domains, remotePatterns } from './imageconfig.json'

export const handler: Handler = createIPXHandler({
  basePath,
  domains,
  remotePatterns,
}) as Handler
/* eslint-enable n/no-missing-import, import/no-unresolved, @typescript-eslint/ban-ts-comment  */
