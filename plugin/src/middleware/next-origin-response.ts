import { NextResponse } from 'next/server'

import type { ElementHandlers } from './html-rewriter'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NextDataTransform = <T extends Record<string, any>>(props: T) => T

// A NextReponse that wraps the Netlify origin response
// We can't pass it through directly, because Next disallows returning a response body
export class NextOriginResponse extends NextResponse {
  private readonly dataTransforms: NextDataTransform[]
  private readonly elementHandlers: Array<[selector: string, handlers: ElementHandlers]>
  constructor(public originResponse: Response) {
    super()

    // These are private in Node when compiling, but we access them in Deno at runtime
    Object.defineProperty(this, 'dataTransforms', {
      value: [],
      enumerable: false,
      writable: false,
    })
    Object.defineProperty(this, 'elementHandlers', {
      value: [],
      enumerable: false,
      writable: false,
    })
  }

  /**
   * Transform the page props before they are passed to the client.
   * This works for both HTML pages and JSON data
   */
  transformData(transform: NextDataTransform) {
    // The transforms are evaluated after the middleware is returned
    this.dataTransforms.push(transform)
  }

  /**
   * Rewrite the response HTML with the given selector and handlers
   */
  rewriteHTML(selector: string, handlers: ElementHandlers) {
    this.elementHandlers.push([selector, handlers])
  }

  get headers(): Headers {
    // If we have the origin response, we should use its headers
    return this.originResponse?.headers || super.headers
  }
}
