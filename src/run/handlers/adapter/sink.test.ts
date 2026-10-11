import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'

import { describe, expect, test } from 'vitest'

import { NodeSink } from './sink.js'

describe('NodeSink', () => {
  test('a render that fails before its headers leaves the response clean for the 500 page', async () => {
    const req = new IncomingMessage(new Socket())
    const res = new ServerResponse(req)
    const sink = new NodeSink(req, res)

    const outcome = await sink.render(
      new Request('https://example.netlify.app/page'),
      async (_, nodeRes) => {
        nodeRes.statusCode = 404
        nodeRes.setHeader('vary', 'rsc')
        nodeRes.setHeader('cache-control', 's-maxage=60')
        throw new Error('render failed')
      },
      { kind: 'next' },
    )

    expect(outcome).toBe('failed')
    expect(res.getHeaderNames()).toEqual([])
    expect(res.statusCode).toBe(200)
    expect(res.headersSent).toBe(false)
    expect(sink.committed).toBe(false)
  })
})
