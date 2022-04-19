/* eslint-disable node/no-missing-import, import/no-unresolved, @typescript-eslint/ban-ts-comment  */
import { Handler } from '@netlify/functions'
import { createIPXHandler } from '@netlify/ipx'

// @ts-ignore Injected at build time
import { basePath, domains } from './imageconfig.json'

export const handler: Handler = createIPXHandler({
  basePath,
  domains,
}) as Handler
/* eslint-enable node/no-missing-import, import/no-unresolved, @typescript-eslint/ban-ts-comment  */
