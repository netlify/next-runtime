/* eslint-disable max-classes-per-file -- the sink and the ways it answers */
// Where a producer writes its response: the client's, or one a regeneration or PPR resume reads
// back, see docs/request-layers.md.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'

import { toComputeResponse, toReqRes } from '../../fetch-api-to-req-res.js'

import type { ResponseHead } from './finalize.js'
import type { Produced } from './types.js'

// 'failed': a render threw before committing, the sink is left as it was
export type Outcome = 'sent' | 'failed'

export type NodeRender = (req: IncomingMessage, res: ServerResponse) => Promise<void>

type CommitHook = (head: ResponseHead, produced: Produced) => ResponseHead

function clearHeaders(res: ServerResponse) {
  for (const name of res.getHeaderNames()) {
    res.removeHeader(name)
  }
}

function setHeaders(res: ServerResponse, headers: Headers) {
  clearHeaders(res)
  for (const [name, value] of headers) {
    if (name !== 'set-cookie') {
      res.setHeader(name, value)
    }
  }
  const cookies = headers.getSetCookie()
  if (cookies.length !== 0) {
    res.setHeader('set-cookie', cookies)
  }
}

// Next commits its headers through `writeHead`, implicitly too (`_implicitHeader` on the first write).
// Returns what puts the original back.
function commitOnWriteHead(
  res: ServerResponse,
  commit: (head: ResponseHead) => ResponseHead,
): () => void {
  const { writeHead: original } = res
  const writeHead = original.bind(res)
  res.writeHead = ((statusCode: number, ...rest: unknown[]) => {
    const passed = typeof rest[0] === 'string' ? rest[1] : rest[0]
    if (Array.isArray(passed)) {
      const flat = passed.flat()
      for (let index = 0; index < flat.length; index += 2) {
        res.appendHeader(String(flat[index]), String(flat[index + 1]))
      }
    } else if (passed && typeof passed === 'object') {
      for (const [name, value] of Object.entries(passed)) {
        if (value !== undefined) {
          res.setHeader(name, value as string | string[])
        }
      }
    }
    const headers = new Headers()
    for (const [name, value] of Object.entries(res.getHeaders())) {
      for (const item of [value ?? []].flat()) {
        headers.append(name, String(item))
      }
    }
    const committed = commit({ status: statusCode, headers })
    setHeaders(res, committed.headers)
    return writeHead(committed.status)
  }) as ServerResponse['writeHead']
  return () => {
    res.writeHead = original
  }
}

/**
 * Status and headers go out once (the commit). Right before, the hooks of whoever owns the sink
 * (finalization, server-timing) run with what the producer said it writes. A sink
 * without hooks gets the response as produced.
 */
export abstract class ResponseSink {
  private produced: Produced = { kind: 'final' }
  private wrap = (produced: Produced) => produced
  private readonly hooks: CommitHook[] = []
  // set at commit
  status?: number

  get described(): Produced {
    return this.produced
  }

  get committed(): boolean {
    return this.status !== undefined
  }

  // what's produced from here on is the error page for `status`
  describeAsErrorPage(status: 404 | 500) {
    const { wrap } = this
    this.wrap = (produced) => wrap({ kind: 'error', status, produced })
  }

  onCommit(hook: CommitHook) {
    this.hooks.push(hook)
  }

  protected commit(head: ResponseHead): ResponseHead {
    const committed = this.hooks.reduce((current, hook) => hook(current, this.produced), head)
    this.status = committed.status
    return committed
  }

  // a response a producer has, `produced` says what it is
  send(response: Response, produced: Produced): Promise<Outcome> {
    this.produced = this.wrap(produced)
    return this.write(response)
  }

  // runs Next's handler with a req/res writing into this sink
  render(
    request: Request,
    render: NodeRender,
    produced: Produced,
    options: { status?: number } = {},
  ): Promise<Outcome> {
    this.produced = this.wrap(produced)
    return this.renderInto(request, render, options)
  }

  protected abstract write(response: Response): Promise<Outcome>

  protected abstract renderInto(
    request: Request,
    render: NodeRender,
    options: { status?: number },
  ): Promise<Outcome>
}

/**
 * A fetch `Response`, available at commit with the body streaming after it (a function's response,
 * or one read back). `keepOpenUntil`: a Next render's body stays open until that settles too.
 */
export class FetchSink extends ResponseSink {
  readonly response: Promise<Response>
  private resolveResponse!: (response: Response) => void

  constructor(private readonly options: { keepOpenUntil?: () => Promise<unknown> } = {}) {
    super()
    this.response = new Promise((resolve) => {
      this.resolveResponse = resolve
    })
  }

  protected async write(response: Response): Promise<Outcome> {
    // a proxied response's headers are immutable
    const head = this.commit({ status: response.status, headers: new Headers(response.headers) })
    this.resolveResponse(new Response(response.body, head))
    return 'sent'
  }

  protected async renderInto(
    request: Request,
    render: NodeRender,
    { status }: { status?: number },
  ): Promise<Outcome> {
    const { req, res } = toReqRes(request)
    if (status) {
      res.statusCode = status
    }
    let failedBeforeHeaders = false
    commitOnWriteHead(res, (head) => (failedBeforeHeaders ? head : this.commit(head)))

    const rendering = render(req, res)

    // a render that throws before committing leaves the sink as it was ('failed'); ending this res
    // lets toComputeResponse resolve instead of waiting for a timeout
    rendering.catch(() => {
      if (!res.headersSent) {
        failedBeforeHeaders = true
        res.statusCode = 500
        res.end('Internal Server Error')
      }
    })

    // Contrary to the docs, this resolves when the headers are available, not when the stream closes.
    // See https://github.com/fastly/http-compute-js/blob/main/src/http-compute-js/http-server.ts#L168-L173
    const response = await toComputeResponse(res)
    if (failedBeforeHeaders) {
      return 'failed'
    }

    const { keepOpenUntil } = this.options
    const untilRendered = async () => {
      // it's important to keep the stream open until the next handler has finished
      await rendering.catch(() => {
        // the renderer reports it
      })
      // Next.js relies on `close` event emitted by response to trigger running callback variant of `next/after`
      // however @fastly/http-compute-js never actually emits that event - so we have to emit it ourselves,
      // otherwise Next would never run the callback variant of `next/after`
      res.emit('close')
      await keepOpenUntil?.()
    }
    if (!response.body) {
      await untilRendered()
    }
    this.resolveResponse(
      new Response(
        response.body?.pipeThrough(new TransformStream({ flush: untilRendered })),
        response,
      ),
    )
    return 'sent'
  }
}

/**
 * The client's own response (Netlify Server): Next renders straight into it, anything else is
 * written into it.
 */
export class NodeSink extends ResponseSink {
  constructor(
    private readonly req: IncomingMessage,
    private readonly res: ServerResponse,
  ) {
    super()
  }

  protected async write(response: Response): Promise<Outcome> {
    const { res } = this
    const head = this.commit({ status: response.status, headers: new Headers(response.headers) })
    setHeaders(res, head.headers)
    res.writeHead(head.status)
    if (response.body) {
      await pipeline(Readable.fromWeb(response.body as NodeReadableStream), res)
    } else {
      res.end()
    }
    return 'sent'
  }

  protected async renderInto(
    request: Request,
    render: NodeRender,
    { status }: { status?: number },
  ): Promise<Outcome> {
    const { req, res } = this
    // as the matched output is invoked
    const url = new URL(request.url)
    req.url = `${url.pathname}${url.search}`
    req.headers = Object.fromEntries(request.headers)
    if (status) {
      res.statusCode = status
    }

    let failedBeforeHeaders = false
    let headersCommitted: (() => void) | undefined
    const committed = new Promise<void>((resolve) => {
      headersCommitted = resolve
    })
    const restore = commitOnWriteHead(res, (head) => {
      headersCommitted?.()
      return this.commit(head)
    })

    const rendering = render(req, res)
    rendering.catch(() => {
      if (!res.headersSent) {
        // The client's response is left as it was ('failed'), without what this render set on it.
        // What it can't take back stays: listeners it added to res (`after()`), a request body it
        // read.
        failedBeforeHeaders = true
        restore()
        clearHeaders(res)
        res.statusCode = 200
      }
    })

    // Next streams the body to the client itself
    await Promise.race([
      committed,
      rendering.catch(() => {
        // the renderer reports it
      }),
    ])
    return failedBeforeHeaders ? 'failed' : 'sent'
  }
}
/* eslint-enable max-classes-per-file */
