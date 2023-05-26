import { createNextDescribe, FileRef } from 'e2e-utils'
import { getRedboxSource, hasRedbox, renderViaHTTP } from 'next-test-utils'
import cheerio from 'cheerio'
import webdriver from 'next-webdriver'
import { join } from 'path'

const getAttrs = (elems: Cheerio) =>
  Array.from(elems)
    .map((elem) => elem.attribs)
    .sort((a, b) => (a.href < b.href ? -1 : 1))

  describe.each([['app'], ['app-old']])('%s', (fixture: string) => {
    createNextDescribe('app dir next-font', {
      files: {
          app: new FileRef(join(__dirname, fixture)),
          fonts: new FileRef(join(__dirname, 'fonts')),
          'next.config.js': new FileRef(join(__dirname, 'next.config.js')),
      },
      dependencies: {
        '@next/font': 'canary',
        react: 'latest',
        'react-dom': 'latest',
      },
      skipDeployment: true,

    },({ next, isNextDev: isDev }) => {

    describe('import values', () => {
      it('should have correct values at /', async () => {
        const html = await renderViaHTTP(next.url, '/')
        const $ = cheerio.load(html)

        // layout
        expect(JSON.parse($('#root-layout').text())).toEqual({
          className: expect.stringMatching(/^__className_.{6}$/),
          variable: expect.stringMatching(/^__variable_.{6}$/),
          style: {
            fontFamily: expect.stringMatching(/^'__font1_.{6}'$/),
          },
        })
        // page
        expect(JSON.parse($('#root-page').text())).toEqual({
          className: expect.stringMatching(/^__className_.{6}$/),
          variable: expect.stringMatching(/^__variable_.{6}$/),
          style: {
            fontFamily: expect.stringMatching(/^'__font2_.{6}'$/),
          },
        })
        // Comp
        expect(JSON.parse($('#root-comp').text())).toEqual({
          className: expect.stringMatching(/^__className_.{6}$/),
          style: {
            fontFamily: expect.stringMatching(/^'__font3_.{6}'$/),
            fontStyle: 'italic',
            fontWeight: 900,
          },
        })
      })

      it('should have correct values at /client', async () => {
        const html = await renderViaHTTP(next.url, '/client')
        const $ = cheerio.load(html)

        // root layout
        expect(JSON.parse($('#root-layout').text())).toEqual({
          className: expect.stringMatching(/^__className_.{6}$/),
          variable: expect.stringMatching(/^__variable_.{6}$/),
          style: {
            fontFamily: expect.stringMatching(/^'__font1_.{6}'$/),
          },
        })

        // layout
        expect(JSON.parse($('#client-layout').text())).toEqual({
          className: expect.stringMatching(/^__className_.{6}$/),
          style: {
            fontFamily: expect.stringMatching(/^'__font4_.{6}'$/),
            fontWeight: 100,
          },
        })
        // page
        expect(JSON.parse($('#client-page').text())).toEqual({
          className: expect.stringMatching(/^__className_.{6}$/),
          style: {
            fontFamily: expect.stringMatching(/^'__font5_.{6}'$/),
            fontStyle: 'italic',
          },
        })
        // Comp
        expect(JSON.parse($('#client-comp').text())).toEqual({
          className: expect.stringMatching(/^__className_.{6}$/),
          style: {
            fontFamily: expect.stringMatching(/^'__font6_.{6}'$/),
          },
        })
      })
    })

    describe('computed styles', () => {
      it('should have correct styles at /', async () => {
        const browser = await webdriver(next.url, '/')

        // layout
        expect(await browser.eval('getComputedStyle(document.querySelector("#root-layout")).fontFamily')).toMatch(
          /^__font1_.{6}$/,
        )
        expect(await browser.eval('getComputedStyle(document.querySelector("#root-layout")).fontWeight')).toBe('400')
        expect(await browser.eval('getComputedStyle(document.querySelector("#root-layout")).fontStyle')).toBe('normal')

        // page
        expect(await browser.eval('getComputedStyle(document.querySelector("#root-page")).fontFamily')).toMatch(
          /^__font2_.{6}$/,
        )
        expect(await browser.eval('getComputedStyle(document.querySelector("#root-page")).fontWeight')).toBe('400')
        expect(await browser.eval('getComputedStyle(document.querySelector("#root-page")).fontStyle')).toBe('normal')

        // Comp
        expect(await browser.eval('getComputedStyle(document.querySelector("#root-comp")).fontFamily')).toMatch(
          /^__font3_.{6}$/,
        )
        expect(await browser.eval('getComputedStyle(document.querySelector("#root-comp")).fontWeight')).toBe('900')
        expect(await browser.eval('getComputedStyle(document.querySelector("#root-comp")).fontStyle')).toBe('italic')
      })

      it('should have correct styles at /client', async () => {
        const browser = await webdriver(next.url, '/client')

        // root layout
        expect(await browser.eval('getComputedStyle(document.querySelector("#root-layout")).fontFamily')).toMatch(
          /^__font1_.{6}$/,
        )
        expect(await browser.eval('getComputedStyle(document.querySelector("#root-layout")).fontWeight')).toBe('400')
        expect(await browser.eval('getComputedStyle(document.querySelector("#root-layout")).fontStyle')).toBe('normal')

        // layout
        expect(await browser.eval('getComputedStyle(document.querySelector("#client-layout")).fontFamily')).toMatch(
          /^__font4_.{6}$/,
        )
        expect(await browser.eval('getComputedStyle(document.querySelector("#client-layout")).fontWeight')).toBe('100')
        expect(await browser.eval('getComputedStyle(document.querySelector("#client-layout")).fontStyle')).toBe('normal')

        // page
        expect(await browser.eval('getComputedStyle(document.querySelector("#client-page")).fontFamily')).toMatch(
          /^__font5_.{6}$/,
        )
        expect(await browser.eval('getComputedStyle(document.querySelector("#client-page")).fontWeight')).toBe('400')
        expect(await browser.eval('getComputedStyle(document.querySelector("#client-page")).fontStyle')).toBe('italic')

        // Comp
        expect(await browser.eval('getComputedStyle(document.querySelector("#client-comp")).fontFamily')).toMatch(
          /^__font6_.{6}$/,
        )
        expect(await browser.eval('getComputedStyle(document.querySelector("#client-comp")).fontWeight')).toBe('400')
        expect(await browser.eval('getComputedStyle(document.querySelector("#client-comp")).fontStyle')).toBe('normal')
      })
    })

    if (!isDev) {
      describe('preload', () => {
        it('should preload correctly with server components', async () => {
          const html = await renderViaHTTP(next.url, '/')
          const $ = cheerio.load(html)

          // Preconnect
          expect($('link[rel="preconnect"]').length).toBe(0)

          expect($('link[as="font"]').length).toBe(3)
          expect(getAttrs($('link[as="font"]'))).toEqual([
            {
              as: 'font',
              crossorigin: '',
              href: '/_next/static/media/b2104791981359ae-s.p.woff2',
              rel: 'preload',
              type: 'font/woff2',
            },
            {
              as: 'font',
              crossorigin: '',
              href: '/_next/static/media/b61859a50be14c53-s.p.woff2',
              rel: 'preload',
              type: 'font/woff2',
            },
            {
              as: 'font',
              crossorigin: '',
              href: '/_next/static/media/e9b9dc0d8ba35f48-s.p.woff2',
              rel: 'preload',
              type: 'font/woff2',
            }
          ])
        })

        it('should preload correctly with client components', async () => {
          const html = await renderViaHTTP(next.url, '/client')
          const $ = cheerio.load(html)

          // Preconnect
          expect($('link[rel="preconnect"]').length).toBe(0)

          // expect($('link[as="font"]').length).toBe(3)
          // From root layout
          expect(getAttrs($('link[as="font"]'))).toEqual([
            {
              as: 'font',
              crossorigin: '',
              href: '/_next/static/media/e1053f04babc7571-s.p.woff2',
              rel: 'preload',
              type: 'font/woff2',
            },
            {
              as: 'font',
              crossorigin: '',
              href: '/_next/static/media/feab2c68f2a8e9a4-s.p.woff2',
              rel: 'preload',
              type: 'font/woff2',
            },
            {
              as: 'font',
              crossorigin: '',
              href: '/_next/static/media/e9b9dc0d8ba35f48-s.p.woff2',
              rel: 'preload',
              type: 'font/woff2',
            }
          ])
        })

        it('should preload correctly with layout using fonts', async () => {
          const html = await renderViaHTTP(next.url, '/layout-with-fonts')
          const $ = cheerio.load(html)

          // Preconnect
          expect($('link[rel="preconnect"]').length).toBe(0)

          // expect($('link[as="font"]').length).toBe(2)
          // From root layout
          expect(getAttrs($('link[as="font"]'))).toEqual([
            {
              as: 'font',
              crossorigin: '',
              href: '/_next/static/media/75c5faeeb9c86969-s.p.woff2',
              rel: 'preload',
              type: 'font/woff2',
            },
            {
              as: 'font',
              crossorigin: '',
              href: '/_next/static/media/e9b9dc0d8ba35f48-s.p.woff2',
              rel: 'preload',
              type: 'font/woff2',
            },
          ])
        })

        it('should preload correctly with page using fonts', async () => {
          const html = await renderViaHTTP(next.url, '/page-with-fonts')
          const $ = cheerio.load(html)

          // Preconnect
          expect($('link[rel="preconnect"]').length).toBe(0)

          // expect($('link[as="font"]').length).toBe(2)
          // From root layout
          expect(getAttrs($('link[as="font"]'))).toEqual([
          {
            as: 'font',
            crossorigin: '',
            href: '/_next/static/media/568e4c6d8123c4d6-s.p.woff2',
            rel: 'preload',
            type: 'font/woff2',
          },
          {
            as: 'font',
            crossorigin: '',
            href: '/_next/static/media/e9b9dc0d8ba35f48-s.p.woff2',
            rel: 'preload',
            type: 'font/woff2',
          },
        ])
      })
    })
    }

    if (isDev) {
      describe('Dev errors', () => {
        it('should recover on font loader error', async () => {
          const browser = await webdriver(next.url, '/')
          const font1Content = await next.readFile('fonts/index.js')

          // Break file
          await next.patchFile('fonts/index.js', font1Content.replace('./font1.woff2', './does-not-exist.woff2'))
          expect(await hasRedbox(browser, true)).toBeTrue()
          expect(await getRedboxSource(browser)).toInclude("Can't resolve './does-not-exist.woff2'")

          // Fix file
          await next.patchFile('fonts/index.js', font1Content)
          await browser.waitForElementByCss('#root-page')
        })
      })
    }
  })
})
