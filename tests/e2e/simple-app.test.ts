import { expect, type Locator } from '@playwright/test'
import { nextVersionSatisfies } from '../utils/next-version-helpers.mjs'
import { test } from '../utils/playwright-helpers.js'

const expectImageWasLoaded = async (locator: Locator) => {
  expect(await locator.evaluate((img: HTMLImageElement) => img.naturalHeight)).toBeGreaterThan(0)
}

test('Renders the Home page correctly', async ({ page, simple }) => {
  const response = await page.goto(simple.url)
  const headers = response?.headers() || {}

  await expect(page).toHaveTitle('Simple Next App')

  expect(headers['cache-status']).toBe('"Next.js"; hit\n"Netlify Edge"; fwd=miss')

  const h1 = page.locator('h1')
  await expect(h1).toHaveText('Home')

  await expectImageWasLoaded(page.locator('img'))

  await page.goto(`${simple.url}/api/static`)

  const body = (await page.$('body').then((el) => el?.textContent())) || '{}'
  expect(body).toBe('{"words":"hello world"}')
})

test('Renders the Home page correctly with distDir', async ({ page, distDir }) => {
  await page.goto(distDir.url)

  await expect(page).toHaveTitle('Simple Next App')

  const h1 = page.locator('h1')
  await expect(h1).toHaveText('Home')

  await expectImageWasLoaded(page.locator('img'))
})

test('Serves a static image correctly', async ({ page, simple }) => {
  const response = await page.goto(`${simple.url}/next.svg`)

  expect(response?.status()).toBe(200)
  expect(response?.headers()['content-type']).toBe('image/svg+xml')
})

test('Redirects correctly', async ({ page, simple }) => {
  await page.goto(`${simple.url}/redirect/response`)
  await expect(page).toHaveURL(`https://www.netlify.com/`)

  await page.goto(`${simple.url}/redirect`)
  await expect(page).toHaveURL(`https://www.netlify.com/`)
})

const waitFor = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// adaptation of https://github.com/vercel/next.js/blob/canary/test/e2e/app-dir/app-static/app-static.test.ts#L1716-L1755
test.skip('streams stale responses', async ({ simple }) => {
  // Introduced in https://github.com/vercel/next.js/pull/55978
  test.skip(!nextVersionSatisfies('>=13.5.4'), 'This test is only for Next.js 13.5.4+')
  // Prime the cache.
  const path = `${simple.url}/stale-cache-serving/app-page`
  const res = await fetch(path)
  expect(res.status).toBe(200)

  // Consume the cache, the revalidations are completed on the end of the
  // stream so we need to wait for that to complete.
  await res.text()

  // different from next.js test:
  // we need to wait another 10secs for the blob to propagate back
  // can be removed once we have a local cache for blobs
  await waitFor(10000)

  for (let i = 0; i < 6; i++) {
    await waitFor(1000)

    const timings = {
      start: Date.now(),
      startedStreaming: 0,
    }

    const res = await fetch(path)

    // eslint-disable-next-line no-loop-func
    await new Promise<void>((resolve) => {
      res.body?.pipeTo(
        new WritableStream({
          write() {
            if (!timings.startedStreaming) {
              timings.startedStreaming = Date.now()
            }
          },
          close() {
            resolve()
          },
        }),
      )
    })

    expect(
      timings.startedStreaming - timings.start,
      `streams in less than 3s, run #${i}/6`,
    ).toBeLessThan(3000)
  }
})

test.describe('next/image is using Netlify Image CDN', () => {
  test('Local images', async ({ page, simple }) => {
    const nextImageResponsePromise = page.waitForResponse('**/_next/image**')

    await page.goto(`${simple.url}/image/local`)

    const nextImageResponse = await nextImageResponsePromise
    expect(nextImageResponse.request().url()).toContain('_next/image?url=%2Fsquirrel.jpg')

    expect(nextImageResponse.status()).toBe(200)
    // ensure next/image is using Image CDN
    // source image is jpg, but when requesting it through Image CDN avif will be returned
    expect(await nextImageResponse.headerValue('content-type')).toEqual('image/avif')

    await expectImageWasLoaded(page.locator('img'))
  })

  test('Remote images: remote patterns #1 (protocol, hostname, pathname set)', async ({
    page,
    simple,
  }) => {
    const nextImageResponsePromise = page.waitForResponse('**/_next/image**')

    await page.goto(`${simple.url}/image/remote-pattern-1`)

    const nextImageResponse = await nextImageResponsePromise

    expect(nextImageResponse.url()).toContain(
      `_next/image?url=${encodeURIComponent(
        'https://images.unsplash.com/photo-1574870111867-089730e5a72b',
      )}`,
    )

    expect(nextImageResponse.status()).toBe(200)
    expect(await nextImageResponse.headerValue('content-type')).toEqual('image/avif')

    await expectImageWasLoaded(page.locator('img'))
  })

  test('Remote images: remote patterns #2 (just hostname starting with wildcard)', async ({
    page,
    simple,
  }) => {
    const nextImageResponsePromise = page.waitForResponse('**/_next/image**')

    await page.goto(`${simple.url}/image/remote-pattern-2`)

    const nextImageResponse = await nextImageResponsePromise

    expect(nextImageResponse.url()).toContain(
      `_next/image?url=${encodeURIComponent(
        'https://cdn.pixabay.com/photo/2017/02/20/18/03/cat-2083492_1280.jpg',
      )}`,
    )

    expect(nextImageResponse.status()).toBe(200)
    expect(await nextImageResponse.headerValue('content-type')).toEqual('image/avif')

    await expectImageWasLoaded(page.locator('img'))
  })

  test('Remote images: domains', async ({ page, simple }) => {
    const nextImageResponsePromise = page.waitForResponse('**/_next/image**')

    await page.goto(`${simple.url}/image/remote-domain`)

    const nextImageResponse = await nextImageResponsePromise

    expect(nextImageResponse.url()).toContain(
      `_next/image?url=${encodeURIComponent(
        'https://images.pexels.com/photos/406014/pexels-photo-406014.jpeg',
      )}`,
    )

    expect(nextImageResponse?.status()).toBe(200)
    expect(await nextImageResponse.headerValue('content-type')).toEqual('image/avif')

    await expectImageWasLoaded(page.locator('img'))
  })

  test('Handling of browser-cached Runtime v4 redirect', async ({ page, simple }) => {
    // Runtime v4 redirects for next/image are 301 and would be cached by browser
    // So this test checks behavior when migrating from v4 to v5 for site visitors
    // and ensure that images are still served through Image CDN
    const nextImageResponsePromise = page.waitForResponse('**/_ipx/**')

    await page.goto(`${simple.url}/image/migration-from-v4-runtime`)

    const nextImageResponse = await nextImageResponsePromise
    // ensure fixture is replicating runtime v4 redirect
    expect(nextImageResponse.request().url()).toContain(
      '_ipx/w_384,q_75/%2Fsquirrel.jpg?url=%2Fsquirrel.jpg&w=384&q=75',
    )

    expect(nextImageResponse.status()).toEqual(200)
    expect(await nextImageResponse.headerValue('content-type')).toEqual('image/avif')

    await expectImageWasLoaded(page.locator('img'))
  })
})

test('requesting a non existing page route that needs to be fetched from the blob store like 404.html', async ({
  page,
  simple,
}) => {
  const response = await page.goto(new URL('non-existing', simple.url).href)
  const headers = response?.headers() || {}
  expect(response?.status()).toBe(404)

  expect(await page.textContent('h1')).toBe('404')

  expect(headers['netlify-cdn-cache-control']).toBe(
    'private, no-cache, no-store, max-age=0, must-revalidate',
  )
  expect(headers['cache-control']).toBe('private,no-cache,no-store,max-age=0,must-revalidate')
})

test('requesting a non existing page route that needs to be fetched from the blob store like 404.html (notFound())', async ({
  page,
  simple,
}) => {
  const response = await page.goto(new URL('not-found', simple.url).href)
  const headers = response?.headers() || {}
  expect(response?.status()).toBe(404)

  expect(await page.textContent('h1')).toBe('404')

  expect(headers['netlify-cdn-cache-control']).toBe(
    's-maxage=31536000, stale-while-revalidate=31536000',
  )
  expect(headers['cache-control']).toBe('public,max-age=0,must-revalidate')
})

test('Compressed rewrites are readable', async ({ simple }) => {
  const resp = await fetch(`${simple.url}/rewrite-no-basepath`)
  expect(resp.headers.get('content-length')).toBeNull()
  expect(resp.headers.get('transfer-encoding')).toEqual('chunked')
  expect(resp.headers.get('content-encoding')).toEqual('br')
  expect(await resp.text()).toContain('<title>Example Domain</title>')
})
