// TEMPLATE: This file will be copied to the Netlify functions directory when
//           running next-on-netlify

// Render on demand builder for the Next.js page
import { getHandlerFunction } from './getHandlerFunction'
import { builder } from '@netlify/functions'
import * as nextPage from './nextPage'

export const handler = builder(getHandlerFunction(nextPage))
