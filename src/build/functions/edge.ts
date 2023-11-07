import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { EDGE_HANDLER_DIR } from '../constants.js'

/**
 * Create a Netlify edge function to run the Next.js server
 */
export const createEdgeHandler = async () => {
  // reset the handler directory
  await rm(join(process.cwd(), EDGE_HANDLER_DIR), { recursive: true, force: true })
  await mkdir(join(process.cwd(), EDGE_HANDLER_DIR), { recursive: true })
}
