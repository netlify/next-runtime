import { createNext, FileRef } from 'e2e-utils'
import { NextInstance } from 'test/lib/next-modes/base'
import { renderViaHTTP, fetchViaHTTP, waitFor } from 'next-test-utils'
import path from 'path'
import cheerio from 'cheerio'

describe('app dir rendering', () => {
  //if ((global as any).isNextDeploy) {
  //  it('should skip next deploy for now', () => {})
  //  return
  //}

  const isDev = (global as any).isNextDev
  let next: NextInstance

  beforeAll(async () => {
    next = await createNext({
      files: new FileRef(path.join(__dirname, 'app-rendering')),
      dependencies: {
        react: 'experimental',
        'react-dom': 'experimental',
      },
    })
  }, 600000)
  afterAll(() => next.destroy())

  it('should serve app/page.server.js at /', async () => {
    const html = await renderViaHTTP(next.url, '/')
    expect(html).toContain('app/page.server.js')
  })

  describe('SSR only', () => {
    it('should run data in layout and page', async () => {
      const html = await renderViaHTTP(next.url, '/ssr-only/nested')
      const $ = cheerio.load(html)
      expect($('#layout-message').text()).toBe('hello from layout')
      expect($('#page-message').text()).toBe('hello from page')
    })

    it('should run data fetch in parallel', async () => {
      const startTime = Date.now()
      const html = await renderViaHTTP(next.url, '/ssr-only/slow')
      const endTime = Date.now()
      const duration = endTime - startTime
      // Each part takes 5 seconds so it should be below 10 seconds
      // Using 7 seconds to ensure external factors causing slight slowness don't fail the tests
      expect(duration < 7000).toBe(true)
      const $ = cheerio.load(html)
      expect($('#slow-layout-message').text()).toBe('hello from slow layout')
      expect($('#slow-page-message').text()).toBe('hello from slow page')
    })
  })

  describe('static only', () => {
    it('should run data in layout and page', async () => {
      const html = await renderViaHTTP(next.url, '/static-only/nested')
      const $ = cheerio.load(html)
      expect($('#layout-message').text()).toBe('hello from layout')
      expect($('#page-message').text()).toBe('hello from page')
    })

    it(`should run data in parallel ${
      isDev ? 'during development' : 'and use cached version for production'
    }`, async () => {
      // const startTime = Date.now()
      const html = await renderViaHTTP(next.url, '/static-only/slow')
      // const endTime = Date.now()
      // const duration = endTime - startTime
      // Each part takes 5 seconds so it should be below 10 seconds
      // Using 7 seconds to ensure external factors causing slight slowness don't fail the tests
      // TODO: cache static props in prod
      // expect(duration < (isDev ? 7000 : 2000)).toBe(true)
      // expect(duration < 7000).toBe(true)
      const $ = cheerio.load(html)
      expect($('#slow-layout-message').text()).toBe('hello from slow layout')
      expect($('#slow-page-message').text()).toBe('hello from slow page')
    })
  })

  describe('ISR', () => {
    // NTL Skip - we don't do 1s ISR, so this would take too long to run
    it.skip('should revalidate the page when revalidate is configured', async () => {
      const getPage = async () => {
        const res = await fetchViaHTTP(next.url, 'isr-multiple/nested')
        const html = await res.text()

        return {
          $: cheerio.load(html),
          cacheHeader: res.headers['x-nextjs-cache'],
        }
      }
      const { $ } = await getPage()
      expect($('#layout-message').text()).toBe('hello from layout')
      expect($('#page-message').text()).toBe('hello from page')

      const layoutNow = $('#layout-now').text()
      const pageNow = $('#page-now').text()

      await waitFor(2000)

      // TODO: implement
      // Trigger revalidate
      // const { cacheHeader: revalidateCacheHeader } = await getPage()
      // expect(revalidateCacheHeader).toBe('STALE')

      // TODO: implement
      const { $: $revalidated /* cacheHeader: revalidatedCacheHeader */ } = await getPage()
      // expect(revalidatedCacheHeader).toBe('REVALIDATED')

      const layoutNowRevalidated = $revalidated('#layout-now').text()
      const pageNowRevalidated = $revalidated('#page-now').text()

      // Expect that the `Date.now()` is different as the page have been regenerated
      expect(layoutNow).not.toBe(layoutNowRevalidated)
      expect(pageNow).not.toBe(pageNowRevalidated)
    })
  })

  // TODO: implement
  describe.skip('mixed static and dynamic', () => {
    it('should generate static data during build and use it', async () => {
      const getPage = async () => {
        const html = await renderViaHTTP(next.url, 'isr-ssr-combined/nested')

        return {
          $: cheerio.load(html),
        }
      }
      const { $ } = await getPage()
      expect($('#layout-message').text()).toBe('hello from layout')
      expect($('#page-message').text()).toBe('hello from page')

      const layoutNow = $('#layout-now').text()
      const pageNow = $('#page-now').text()

      const { $: $second } = await getPage()

      const layoutNowSecond = $second('#layout-now').text()
      const pageNowSecond = $second('#page-now').text()

      // Expect that the `Date.now()` is different as it came from getServerSideProps
      expect(layoutNow).not.toBe(layoutNowSecond)
      // Expect that the `Date.now()` is the same as it came from getStaticProps
      expect(pageNow).toBe(pageNowSecond)
    })
  })
})
