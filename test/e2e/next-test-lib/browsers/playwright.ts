import { BrowserInterface, Event } from './base'
import fs from 'fs-extra'
import { chromium, webkit, firefox, Browser, BrowserContext, Page, ElementHandle, devices } from 'playwright-chromium'
import path from 'path'

let page: Page
let browser: Browser
let context: BrowserContext
let pageLogs: Array<{ source: string; message: string }> = []
let websocketFrames: Array<{ payload: string | Buffer }> = []

const tracePlaywright = process.env.TRACE_PLAYWRIGHT

export async function quit() {
  await context?.close()
  await browser?.close()
}

export class Playwright extends BrowserInterface {
  private activeTrace?: string
  private eventCallbacks: Record<Event, Set<(...args: any[]) => void>> = {
    request: new Set(),
  }

  on(event: Event, cb: (...args: any[]) => void) {
    if (!this.eventCallbacks[event]) {
      throw new Error(`Invalid event passed to browser.on, received ${event}. Valid events are ${Object.keys(event)}`)
    }
    this.eventCallbacks[event]?.add(cb)
  }
  off(event: Event, cb: (...args: any[]) => void) {
    this.eventCallbacks[event]?.delete(cb)
  }

  async setup(browserName: string, locale?: string) {
    if (browser) return
    const headless = !!process.env.HEADLESS
    let device

    if (process.env.DEVICE_NAME) {
      device = devices[process.env.DEVICE_NAME]

      if (!device) {
        throw new Error(`Invalid playwright device name ${process.env.DEVICE_NAME}`)
      }
    }

    if (browserName === 'safari') {
      browser = await webkit.launch({ headless })
    } else if (browserName === 'firefox') {
      browser = await firefox.launch({ headless })
    } else {
      browser = await chromium.launch({ headless, devtools: !headless })
    }
    context = await browser.newContext({ locale, ...device })
  }

  async get(url: string): Promise<void> {
    return page.goto(url) as any
  }

  async loadPage(url: string, opts?: { disableCache: boolean; beforePageLoad?: (...args: any[]) => void }) {
    if (this.activeTrace) {
      const traceDir = path.join(__dirname, '../../traces')
      const traceOutputPath = path.join(
        traceDir,
        `${path.relative(path.join(__dirname, '../../'), process.env.TEST_FILE_PATH ?? '').replace(/\//g, '-')}`,
        `playwright-${this.activeTrace}-${Date.now()}.zip`,
      )

      await fs.remove(traceOutputPath)
      await context.tracing
        .stop({
          path: traceOutputPath,
        })
        .catch((err) => console.error('failed to write playwright trace', err))
    }

    // clean-up existing pages
    for (const oldPage of context.pages()) {
      await oldPage.close()
    }
    page = await context.newPage()
    pageLogs = []
    websocketFrames = []

    page.on('console', (msg) => {
      console.log('browser log:', msg)
      pageLogs.push({ source: msg.type(), message: msg.text() })
    })
    page.on('crash', (page) => {
      console.error('page crashed')
    })
    page.on('pageerror', (error) => {
      console.error('page error', error)
    })
    page.on('request', (req) => {
      this.eventCallbacks.request.forEach((cb) => cb(req))
    })

    if (opts?.disableCache) {
      // TODO: this doesn't seem to work (dev tools does not check the box as expected)
      const session = await context.newCDPSession(page)
      session.send('Network.setCacheDisabled', { cacheDisabled: true })
    }

    page.on('websocket', (ws) => {
      if (tracePlaywright) {
        page.evaluate(`console.log('connected to ws at ${ws.url()}')`).catch(() => {})

        ws.on('close', () => page.evaluate(`console.log('closed websocket ${ws.url()}')`).catch(() => {}))
      }
      ws.on('framereceived', (frame) => {
        websocketFrames.push({ payload: frame.payload })

        if (tracePlaywright) {
          if (!frame.payload.includes('pong')) {
            page.evaluate(`console.log('received ws message ${frame.payload}')`).catch(() => {})
          }
        }
      })
    })

    opts?.beforePageLoad?.(page)

    if (tracePlaywright) {
      await context.tracing.start({
        screenshots: true,
        snapshots: true,
      })
      this.activeTrace = encodeURIComponent(url)
    }
    await page.goto(url, { waitUntil: 'load' })
  }

  back(): BrowserInterface {
    return this.chain(() => {
      return page.goBack()
    })
  }
  forward(): BrowserInterface {
    return this.chain(() => {
      return page.goForward()
    })
  }
  refresh(): BrowserInterface {
    return this.chain(() => {
      return page.reload()
    })
  }
  setDimensions({ width, height }: { height: number; width: number }): BrowserInterface {
    return this.chain(() => page.setViewportSize({ width, height }))
  }
  addCookie(opts: { name: string; value: string }): BrowserInterface {
    return this.chain(async () =>
      context.addCookies([
        {
          path: '/',
          domain: await page.evaluate('window.location.hostname'),
          ...opts,
        },
      ]),
    )
  }
  deleteCookies(): BrowserInterface {
    return this.chain(async () => context.clearCookies())
  }

  focusPage() {
    return this.chain(() => page.bringToFront())
  }

  private wrapElement(el: ElementHandle, selector: string) {
    ;(el as any).selector = selector
    ;(el as any).text = () => el.innerText()
    ;(el as any).getComputedCss = (prop) =>
      page.evaluate(
        function (args) {
          return getComputedStyle(document.querySelector(args.selector)!)[args.prop] || null
        },
        { selector, prop },
      )
    ;(el as any).getCssValue = (el as any).getComputedCss
    ;(el as any).getValue = () =>
      page.evaluate(
        function (args) {
          return (document.querySelector(args.selector) as any).value
        },
        { selector },
      )
    return el
  }

  elementByCss(selector: string) {
    return this.waitForElementByCss(selector)
  }

  elementById(sel) {
    return this.elementByCss(`#${sel}`)
  }

  getValue() {
    return this.chain((el) =>
      page.evaluate(
        function (args) {
          return document.querySelector(args.selector).value
        },
        { selector: el.selector },
      ),
    ) as any
  }

  text() {
    return this.chain((el) => el.text()) as any
  }

  type(text) {
    return this.chain((el) => el.type(text))
  }

  moveTo() {
    return this.chain((el) => {
      return page.hover(el.selector).then(() => el)
    })
  }

  async getComputedCss(prop: string) {
    return this.chain((el) => {
      return el.getCssValue(prop)
    }) as any
  }

  async getAttribute(attr) {
    return this.chain((el) => el.getAttribute(attr))
  }

  async hasElementByCssSelector(selector: string) {
    return this.eval(`!!document.querySelector('${selector}')`) as any
  }

  keydown(key: string): BrowserInterface {
    return this.chain((el) => {
      return page.keyboard.down(key).then(() => el)
    })
  }

  keyup(key: string): BrowserInterface {
    return this.chain((el) => {
      return page.keyboard.up(key).then(() => el)
    })
  }

  click() {
    return this.chain((el) => {
      return el.click().then(() => el)
    })
  }

  touchStart() {
    return this.chain((el: ElementHandle) => {
      return el.dispatchEvent('touchstart').then(() => el)
    })
  }

  elementsByCss(sel) {
    return this.chain(() =>
      page.$$(sel).then((els) => {
        return els.map((el) => {
          const origGetAttribute = el.getAttribute.bind(el)
          el.getAttribute = (name) => {
            // ensure getAttribute defaults to empty string to
            // match selenium
            return origGetAttribute(name).then((val) => val || '')
          }
          return el
        })
      }),
    ) as any as BrowserInterface[]
  }

  waitForElementByCss(selector, timeout?: number) {
    return this.chain(() => {
      return page.waitForSelector(selector, { timeout, state: 'attached' }).then(async (el) => {
        // it seems selenium waits longer and tests rely on this behavior
        // so we wait for the load event fire before returning
        await page.waitForLoadState()
        return this.wrapElement(el, selector)
      })
    })
  }

  waitForCondition(condition, timeout) {
    return this.chain(() => {
      return page.waitForFunction(condition, { timeout })
    })
  }

  async eval(snippet) {
    // TODO: should this and evalAsync be chained? Might lead
    // to bad chains
    return page
      .evaluate(snippet)
      .catch((err) => {
        console.error('eval error:', err)
        return null
      })
      .then(async (val) => {
        await page.waitForLoadState()
        return val
      })
  }

  async evalAsync(snippet) {
    if (typeof snippet === 'function') {
      snippet = snippet.toString()
    }

    if (snippet.includes(`var callback = arguments[arguments.length - 1]`)) {
      snippet = `(function() {
        return new Promise((resolve, reject) => {
          const origFunc = ${snippet}
          try {
            origFunc(resolve)
          } catch (err) {
            reject(err)
          }
        })
      })()`
    }

    return page.evaluate(snippet).catch(() => null)
  }

  async log() {
    return this.chain(() => pageLogs) as any
  }

  async websocketFrames() {
    return this.chain(() => websocketFrames) as any
  }

  async url() {
    return this.chain(() => page.evaluate('window.location.href')) as any
  }
}
