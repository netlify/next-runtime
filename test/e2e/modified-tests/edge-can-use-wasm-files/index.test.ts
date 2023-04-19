import { createNext, FileRef } from 'e2e-utils'
import { NextInstance } from 'test/lib/next-modes/base'
import { fetchViaHTTP } from 'next-test-utils'
import path from 'path'
import fs from 'fs-extra'

function extractJSON(response) {
  return JSON.parse(response.headers.get('data') ?? '{}')
}

function baseNextConfig(): Parameters<typeof createNext>[0] {
  return {
    files: {
      'src/add.wasm': new FileRef(path.join(__dirname, './add.wasm')),
      'src/add.js': `
          import wasm from './add.wasm?module'
          const instance$ = WebAssembly.instantiate(wasm);

          export async function increment(a) {
            const { instance } = await instance$;
            return instance.exports.add_one(a);
          }
        `,
      'pages/index.js': `
          export default function () { return <div>Hello, world!</div> }
        `,
      'middleware.js': `
          import { increment } from './src/add.js'
          export default async function middleware(request) {
            const input = Number(request.nextUrl.searchParams.get('input')) || 1;
            const value = await increment(input);
            return new Response(null, { headers: { data: JSON.stringify({ input, value }) } });
          }
        `,
    },
  }
}

describe('edge api endpoints can use wasm files', () => {
  let next: NextInstance

  beforeAll(async () => {
    next = await createNext({
      files: {
        'pages/api/add.js': `
          import { increment } from '../../src/add.js'
          export default async (request) => {
            const input = Number(request.nextUrl.searchParams.get('input')) || 1;
            const value = await increment(input);
            return new Response(null, { headers: { data: JSON.stringify({ input, value }) } });
          }
          export const config = { runtime: 'edge' };
        `,
        'src/add.wasm': new FileRef(path.join(__dirname, './add.wasm')),
        'src/add.js': `
          import wasm from './add.wasm?module'
          const instance$ = WebAssembly.instantiate(wasm);

          export async function increment(a) {
            const { instance } = await instance$;
            return instance.exports.add_one(a);
          }
        `,
      },
    })
  })
  afterAll(() => next.destroy())
  it('uses the wasm file', async () => {
    const response = await fetchViaHTTP(next.url, '/api/add', { input: 10 })
    expect(extractJSON(response)).toEqual({
      input: 10,
      value: 11,
    })
  })
})

describe('middleware can use wasm files', () => {
  let next: NextInstance

  beforeAll(async () => {
    const config = baseNextConfig()
    next = await createNext(config)
  })
  afterAll(() => next.destroy())

  it('uses the wasm file', async () => {
    const response = await fetchViaHTTP(next.url, '/')
    expect(extractJSON(response)).toEqual({
      input: 1,
      value: 2,
    })
  })

  it('can be called twice', async () => {
    const response = await fetchViaHTTP(next.url, '/', { input: 2 })
    expect(extractJSON(response)).toEqual({
      input: 2,
      value: 3,
    })
  })

  if (!(global as any).isNextDeploy) {
    it('lists the necessary wasm bindings in the manifest', async () => {
      const manifestPath = path.join(next.testDir, '.next/server/middleware-manifest.json')
      const manifest = await fs.readJSON(manifestPath)
      expect(manifest.middleware['/']).toMatchObject({
        wasm: [
          {
            filePath: 'server/edge-chunks/wasm_58ccff8b2b94b5dac6ef8957082ecd8f6d34186d.wasm',
            name: 'wasm_58ccff8b2b94b5dac6ef8957082ecd8f6d34186d',
          },
        ],
      })
    })
  }
})

describe('middleware can use wasm files with the experimental modes on', () => {
  let next: NextInstance

  beforeAll(async () => {
    const config = baseNextConfig()
    config.files['next.config.js'] = `
      module.exports = {
        webpack(config) {
          config.output.webassemblyModuleFilename = 'static/wasm/[modulehash].wasm'

          // Since Webpack 5 doesn't enable WebAssembly by default, we should do it manually
          config.experiments = { ...config.experiments, asyncWebAssembly: true }

          return config
        },
      }
    `
    next = await createNext(config)
  })
  afterAll(() => next.destroy())

  it('uses the wasm file', async () => {
    const response = await fetchViaHTTP(next.url, '/')
    expect(extractJSON(response)).toEqual({
      input: 1,
      value: 2,
    })
  })
})
