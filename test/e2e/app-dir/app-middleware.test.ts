/* eslint-env jest */

import { NextInstance } from 'test/lib/next-modes/base'
import { fetchViaHTTP, renderViaHTTP } from 'next-test-utils'
import { createNext, FileRef } from 'e2e-utils'
import cheerio from 'cheerio'
import path from 'path'

// NTL Skip - we need to implement header mutation
describe.skip('app-dir with middleware', () => {
  //if ((global as any).isNextDeploy) {
  //  it('should skip next deploy for now', () => {})
  //  return
  //}

  let next: NextInstance

  afterAll(() => next.destroy())
  beforeAll(async () => {
    next = await createNext({
      files: new FileRef(path.join(__dirname, 'app-middleware')),
    })
  }, 600000)

  describe.each([
    {
      title: 'Serverless Functions',
      path: '/api/dump-headers-serverless',
      toJson: (res: Response) => res.json(),
    },
    {
      title: 'Edge Functions',
      path: '/api/dump-headers-edge',
      toJson: (res: Response) => res.json(),
    },
    {
      title: 'next/headers',
      path: '/headers',
      toJson: async (res: Response) => {
        const $ = cheerio.load(await res.text())
        return JSON.parse($('#headers').text())
      },
    },
  ])('Mutate request headers for $title', ({ path, toJson }) => {
    it(`Adds new headers`, async () => {
      const res = await fetchViaHTTP(next.url, path, null, {
        headers: {
          'x-from-client': 'hello-from-client',
        },
      })
      expect(await toJson(res)).toMatchObject({
        'x-from-client': 'hello-from-client',
        'x-from-middleware': 'hello-from-middleware',
      })
    })

    it(`Deletes headers`, async () => {
      const res = await fetchViaHTTP(
        next.url,
        path,
        {
          'remove-headers': 'x-from-client1,x-from-client2',
        },
        {
          headers: {
            'x-from-client1': 'hello-from-client',
            'X-From-Client2': 'hello-from-client',
          },
        },
      )

      const json = await toJson(res)
      expect(json).not.toHaveProperty('x-from-client1')
      expect(json).not.toHaveProperty('X-From-Client2')
      expect(json).toMatchObject({
        'x-from-middleware': 'hello-from-middleware',
      })

      // Should not be included in response headers.
      expect(res.headers.get('x-middleware-override-headers')).toBeNull()
      expect(res.headers.get('x-middleware-request-x-from-middleware')).toBeNull()
      expect(res.headers.get('x-middleware-request-x-from-client1')).toBeNull()
      expect(res.headers.get('x-middleware-request-x-from-client2')).toBeNull()
    })

    it(`Updates headers`, async () => {
      const res = await fetchViaHTTP(
        next.url,
        path,
        {
          'update-headers': 'x-from-client1=new-value1,x-from-client2=new-value2',
        },
        {
          headers: {
            'x-from-client1': 'old-value1',
            'X-From-Client2': 'old-value2',
            'x-from-client3': 'old-value3',
          },
        },
      )
      expect(await toJson(res)).toMatchObject({
        'x-from-client1': 'new-value1',
        'x-from-client2': 'new-value2',
        'x-from-client3': 'old-value3',
        'x-from-middleware': 'hello-from-middleware',
      })

      // Should not be included in response headers.
      expect(res.headers.get('x-middleware-override-headers')).toBeNull()
      expect(res.headers.get('x-middleware-request-x-from-middleware')).toBeNull()
      expect(res.headers.get('x-middleware-request-x-from-client1')).toBeNull()
      expect(res.headers.get('x-middleware-request-x-from-client2')).toBeNull()
      expect(res.headers.get('x-middleware-request-x-from-client3')).toBeNull()
    })
  })
})

describe('app dir middleware without pages dir', () => {
  //if ((global as any).isNextDeploy) {
  //  it('should skip next deploy for now', () => {})
  //  return
  //}

  let next: NextInstance

  afterAll(() => next.destroy())
  beforeAll(async () => {
    next = await createNext({
      files: {
        app: new FileRef(path.join(__dirname, 'app-middleware/app')),
        'next.config.js': new FileRef(path.join(__dirname, 'app-middleware/next.config.js')),
        'middleware.js': `
          import { NextResponse } from 'next/server'

          export async function middleware(request) {
            return new NextResponse('redirected')
          }

          export const config = {
            matcher: '/headers'
          }
        `,
      },
    })
  }, 600000)

  it(`Updates headers`, async () => {
    const html = await renderViaHTTP(next.url, '/headers')

    expect(html).toContain('redirected')
  })
})
