import { mkdir, rm } from 'node:fs/promises'
import { EDGE_HANDLER_DIR } from '../constants.js'

/**
 * Create a Netlify edge function to run the Next.js server
 */
export const createEdgeHandler = async () => {
  // reset the handler directory
  await rm(EDGE_HANDLER_DIR, { recursive: true, force: true })
  await mkdir(EDGE_HANDLER_DIR, { recursive: true })
}
