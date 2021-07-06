// TEMPLATE: This file will be copied to the Netlify functions directory when
//           running next-on-netlify

// Render function for the Next.js page

import { getHandlerFunction } from './getHandlerFunction'
import * as nextPage from './nextPage'

export const handler = getHandlerFunction(nextPage)
