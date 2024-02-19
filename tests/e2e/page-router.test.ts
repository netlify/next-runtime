import { expect } from '@playwright/test'
import { test } from '../utils/create-e2e-fixture.js'

test('Static revalidate works correctly', async ({ page, pageRouter }) => {
  // in case there is retry or some other test did hit that path before
  // we want to make sure that cdn cache is not warmed up
  const purgeCdnCache = await page.goto(
    new URL('/api/purge-cdn?path=/static/revalidate-manual', pageRouter.url).href,
  )
  expect(purgeCdnCache?.status()).toBe(200)

  const response1 = await page.goto(new URL('static/revalidate-manual', pageRouter.url).href)
  const headers1 = response1?.headers() || {}
  expect(response1?.status()).toBe(200)
  expect(headers1['x-nextjs-cache']).toBeUndefined()
  // either first time hitting this route or we invalidated
  // just CDN node in earlier step
  // we will invoke function and see Next cache hit status \
  // in the response because it was prerendered at build time
  // or regenerated in previous attempt to run this test
  expect(headers1['cache-status']).toMatch(/"Netlify Edge"; fwd=(miss|stale)/m)
  expect(headers1['cache-status']).toMatch(/"Next.js"; hit/m)
  expect(headers1['netlify-cdn-cache-control']).toBe(
    's-maxage=31536000, stale-while-revalidate=31536000',
  )

  const date1 = await page.textContent('[data-testid="date-now"]')
  const h1 = await page.textContent('h1')
  expect(h1).toBe('Show #71')

  const response2 = await page.goto(new URL('static/revalidate-manual', pageRouter.url).href)
  const headers2 = response2?.headers() || {}
  expect(response2?.status()).toBe(200)
  expect(headers2['x-nextjs-cache']).toBeUndefined()
  // we are hitting the same page again and we most likely will see
  // CDN hit (in this case Next reported cache status is omitted
  // as it didn't actually take place in handling this request)
  // or we will see CDN miss because different CDN node handled request
  expect(headers2['cache-status']).toMatch(/"Netlify Edge"; (hit|fwd=miss|fwd=stale)/m)
  if (!headers2['cache-status'].includes('hit')) {
    // if we missed CDN cache, we will see Next cache hit status
    // as we reuse cached response
    expect(headers2['cache-status']).toMatch(/"Next.js"; hit/m)
  }
  expect(headers2['netlify-cdn-cache-control']).toBe(
    's-maxage=31536000, stale-while-revalidate=31536000',
  )

  // the page is cached
  const date2 = await page.textContent('[data-testid="date-now"]')
  expect(date2).toBe(date1)

  const revalidate = await page.goto(new URL('/api/revalidate', pageRouter.url).href)
  expect(revalidate?.status()).toBe(200)

  // wait a bit until the page got regenerated
  await page.waitForTimeout(100)

  // now after the revalidation it should have a different date
  const response3 = await page.goto(new URL('static/revalidate-manual', pageRouter.url).href)
  const headers3 = response3?.headers() || {}
  expect(response3?.status()).toBe(200)
  expect(headers3?.['x-nextjs-cache']).toBeUndefined()
  // revalidate refreshes Next cache, but not CDN cache
  // so our request after revalidation means that Next cache is already
  // warmed up with fresh response, but CDN cache just knows that previously
  // cached response is stale, so we are hitting our function that serve
  // already cached response
  expect(headers3['cache-status']).toMatch(/"Next.js"; hit/m)
  expect(headers3['cache-status']).toMatch(/"Netlify Edge"; fwd=stale/m)

  // the page has now an updated date
  const date3 = await page.textContent('[data-testid="date-now"]')
  expect(date3).not.toBe(date2)
})

test('requesting a non existing page route that needs to be fetched from the blob store like 404.html', async ({
  page,
  pageRouter,
}) => {
  const response = await page.goto(new URL('non-exisitng', pageRouter.url).href)
  const headers = response?.headers() || {}
  expect(response?.status()).toBe(404)

  expect(await page.textContent('h1')).toBe('404')

  expect(headers['netlify-cdn-cache-control']).toBe(
    'no-cache, no-store, max-age=0, must-revalidate',
  )
  expect(headers['cache-control']).toBe('no-cache,no-store,max-age=0,must-revalidate')
})

test('requesting a page with a very long name works', async ({ page, pageRouter }) => {
  const response = await page.goto(
    new URL(
      '/products/an-incredibly-long-product-name-thats-impressively-repetetively-needlessly-overdimensioned-and-should-be-shortened-to-less-than-255-characters-for-the-sake-of-seo-and-ux-and-first-and-foremost-for-gods-sake-but-nobody-wont-ever-read-this-anyway',
      pageRouter.url,
    ).href,
  )
  expect(response?.status()).toBe(200)
})

export function waitFor(millis: number) {
  return new Promise((resolve) => setTimeout(resolve, millis))
}

/**
 * Check for content in 1 second intervals timing out after 30 seconds.
 *
 * @param {() => Promise<unknown> | unknown} contentFn
 * @param {RegExp | string | number} regex
 * @param {boolean} hardError
 * @param {number} maxRetries
 * @returns {Promise<boolean>}
 */
export async function check(
  contentFn: () => any | Promise<any>,
  regex: any,
  hardError = true,
  maxRetries = 30,
) {
  let content
  let lastErr

  for (let tries = 0; tries < maxRetries; tries++) {
    try {
      content = await contentFn()
      if (typeof regex !== typeof /regex/) {
        if (regex === content) {
          return true
        }
      } else if (regex.test(content)) {
        // found the content
        return true
      }
      await waitFor(1000)
    } catch (err) {
      await waitFor(1000)
      lastErr = err
    }
  }
  console.error('TIMED OUT CHECK: ', { regex, content, lastErr })

  if (hardError) {
    throw new Error('TIMED OUT: ' + regex + '\n\n' + content + '\n\n' + lastErr)
  }
  return false
}

// adapted from https://github.com/vercel/next.js/blob/89fcf68c6acd62caf91a8cf0bfd3fdc566e75d9d/test/e2e/app-dir/app-static/app-static.test.ts#L108

test('unstable-cache should work', async ({ pageRouter }) => {
  const pathname = `${pageRouter.url}/api/unstable-cache-node`
  let res = await fetch(`${pageRouter.url}/api/unstable-cache-node`)
  expect(res.status).toBe(200)
  let prevData = await res.json()

  expect(prevData.data.random).toBeTruthy()

  await check(async () => {
    res = await fetch(pathname)
    expect(res.status).toBe(200)
    const curData = await res.json()

    try {
      expect(curData.data.random).toBeTruthy()
      expect(curData.data.random).toBe(prevData.data.random)
    } finally {
      prevData = curData
    }
    return 'success'
  }, 'success')
})

test('Fully static pages should be cached permanently', async ({ page, pageRouter }) => {
  const response = await page.goto(new URL('static/fully-static', pageRouter.url).href)
  const headers = response?.headers() || {}

  expect(headers['netlify-cdn-cache-control']).toBe('max-age=31536000')
  expect(headers['cache-control']).toBe('public,max-age=0,must-revalidate')
})
