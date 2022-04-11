/* eslint-disable node/no-missing-import, import/no-unresolved, @typescript-eslint/ban-ts-comment  */
import { createIPXHandler } from '@netlify/ipx'

// @ts-ignore Injected at build time
import { basePath, domains } from './imageconfig.json'

export const handler = createIPXHandler({
  basePath,
  domains,
})
/* eslint-enable node/no-missing-import, import/no-unresolved, @typescript-eslint/ban-ts-comment  */
