import { type Locator, expect } from '@playwright/test'
import { test } from '../utils/create-e2e-fixture.js'

const expectImageWasLoaded = async (locator: Locator) => {
  expect(await locator.evaluate((img: HTMLImageElement) => img.naturalHeight)).toBeGreaterThan(0)
}

test('Renders the Home page correctly', async ({ page, simpleNextApp }) => {
  await page.goto(simpleNextApp.url)

  await expect(page).toHaveTitle('Simple Next App')

  const h1 = page.locator('h1')
  await expect(h1).toHaveText('Home')

  await expectImageWasLoaded(page.locator('img'))

  await page.goto(`${simpleNextApp.url}/api/static`)

  const body = (await page.$('body').then((el) => el?.textContent())) || '{}'
  expect(body).toBe('{"words":"hello world"}')
})

test('Renders the Home page correctly with distDir', async ({ page, simpleNextAppDistDir }) => {
  await page.goto(simpleNextAppDistDir.url)

  await expect(page).toHaveTitle('Simple Next App')

  const h1 = page.locator('h1')
  await expect(h1).toHaveText('Home')

  await expectImageWasLoaded(page.locator('img'))
})

test('Serves a static image correctly', async ({ page, simpleNextApp }) => {
  const response = await page.goto(`${simpleNextApp.url}/next.svg`)

  expect(response?.status()).toBe(200)
  expect(response?.headers()['content-type']).toBe('image/svg+xml')
})

test('Redirects correctly', async ({ page, simpleNextApp }) => {
  await page.goto(`${simpleNextApp.url}/redirect/response`)
  await expect(page).toHaveURL(`https://www.netlify.com/`)

  await page.goto(`${simpleNextApp.url}/redirect`)
  await expect(page).toHaveURL(`https://www.netlify.com/`)
})

const waitFor = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// adaptation of https://github.com/vercel/next.js/blob/canary/test/e2e/app-dir/app-static/app-static.test.ts#L1716-L1755
test('streams stale responses', async ({ simpleNextApp }) => {
  // Prime the cache.
  const path = `${simpleNextApp.url}/stale-cache-serving/app-page`
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
  test('Local images', async ({ page, simpleNextApp }) => {
    const nextImageResponsePromise = page.waitForResponse('**/_next/image**')

    await page.goto(`${simpleNextApp.url}/image/local`)

    const nextImageResponse = await nextImageResponsePromise
    expect(nextImageResponse.request().url()).toContain('_next/image?url=%2Fsquirrel.jpg')
    // ensure next/image is using Image CDN
    // source image is jpg, but when requesting it through Image CDN avif will be returned
    expect(await nextImageResponse.headerValue('content-type')).toEqual('image/avif')

    await expectImageWasLoaded(page.locator('img'))
  })

  test('Remote images: remote patterns #1 (protocol, hostname, pathname set)', async ({
    page,
    simpleNextApp,
  }) => {
    const nextImageResponsePromise = page.waitForResponse('**/_next/image**')

    await page.goto(`${simpleNextApp.url}/image/remote-pattern-1`)

    const nextImageResponse = await nextImageResponsePromise

    expect(nextImageResponse.url()).toContain(
      `_next/image?url=${encodeURIComponent(
        'https://images.unsplash.com/photo-1574870111867-089730e5a72b',
      )}`,
    )

    await expect(nextImageResponse?.status()).toBe(200)
    await expect(await nextImageResponse.headerValue('content-type')).toEqual('image/avif')
  })

  test('Remote images: remote patterns #2 (just hostname starting with wildcard)', async ({
    page,
    simpleNextApp,
  }) => {
    const nextImageResponsePromise = page.waitForResponse('**/_next/image**')

    await page.goto(`${simpleNextApp.url}/image/remote-pattern-2`)

    const nextImageResponse = await nextImageResponsePromise

    expect(nextImageResponse.url()).toContain(
      `_next/image?url=${encodeURIComponent(
        'https://cdn.pixabay.com/photo/2017/02/20/18/03/cat-2083492_1280.jpg',
      )}`,
    )

    await expect(nextImageResponse?.status()).toBe(200)
    await expect(await nextImageResponse.headerValue('content-type')).toEqual('image/avif')
  })

  test('Remote images: domains', async ({ page, simpleNextApp }) => {
    const nextImageResponsePromise = page.waitForResponse('**/_next/image**')

    await page.goto(`${simpleNextApp.url}/image/remote-domain`)

    const nextImageResponse = await nextImageResponsePromise

    expect(nextImageResponse.url()).toContain(
      `_next/image?url=${encodeURIComponent(
        'https://images.pexels.com/photos/406014/pexels-photo-406014.jpeg',
      )}`,
    )

    await expect(nextImageResponse?.status()).toBe(200)
    await expect(await nextImageResponse.headerValue('content-type')).toEqual('image/avif')
  })
})
