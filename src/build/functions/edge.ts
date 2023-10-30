import { emptyDir } from 'fs-extra/esm'
import { EDGE_HANDLER_DIR } from '../constants.js'

/**
 * Create a Netlify edge function to run the Next.js server
 */
export const createEdgeHandler = async () => {
  // reset the handler directory
  await emptyDir(EDGE_HANDLER_DIR)
}
