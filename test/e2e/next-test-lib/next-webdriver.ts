import { getFullUrl } from './next-test-utils'
import { BrowserInterface } from './browsers/base'
;(global as any).browserName = process.env.BROWSER_NAME || 'chrome'

let browserQuit: () => Promise<void>

if (typeof afterAll === 'function') {
  afterAll(async () => {
    if (browserQuit) {
      await browserQuit()
    }
  })
}

/**
 *
 * @param appPortOrUrl can either be the port or the full URL
 * @param url the path/query to append when using appPort
 * @param options.waitHydration whether to wait for react hydration to finish
 * @param options.retryWaitHydration allow retrying hydration wait if reload occurs
 * @param options.disableCache disable cache for page load
 * @param options.beforePageLoad the callback receiving page instance before loading page
 * @returns thenable browser instance
 */
export default async function webdriver(
  appPortOrUrl: string | number,
  url: string,
  options?: {
    waitHydration?: boolean
    retryWaitHydration?: boolean
    disableCache?: boolean
    beforePageLoad?: (page: any) => void
    locale?: string
  },
): Promise<BrowserInterface> {
  let CurrentInterface: typeof BrowserInterface

  const defaultOptions = {
    waitHydration: true,
    retryWaitHydration: false,
    disableCache: false,
  }
  options = Object.assign(defaultOptions, options)
  const { waitHydration, retryWaitHydration, disableCache, beforePageLoad, locale } = options

  const { Playwright, quit } = await import('./browsers/playwright')
  CurrentInterface = Playwright
  browserQuit = quit

  const browser = new CurrentInterface()
  const browserName = process.env.BROWSER_NAME || 'chrome'
  await browser.setup(browserName, locale)
  ;(global as any).browserName = browserName

  const fullUrl = getFullUrl(appPortOrUrl, url, 'localhost')

  console.log(`\n> Loading browser with ${fullUrl}\n`)

  await browser.loadPage(fullUrl, { disableCache, beforePageLoad })
  console.log(`\n> Loaded browser with ${fullUrl}\n`)

  // Wait for application to hydrate
  if (waitHydration) {
    console.log(`\n> Waiting hydration for ${fullUrl}\n`)

    const checkHydrated = async () => {
      await browser.evalAsync(function () {
        var callback = arguments[arguments.length - 1]

        // if it's not a Next.js app return
        if (
          document.documentElement.innerHTML.indexOf('__NEXT_DATA__') === -1 &&
          // @ts-ignore next exists on window if it's a Next.js page.
          typeof ((window as any).next && (window as any).next.version) === 'undefined'
        ) {
          console.log('Not a next.js page, resolving hydrate check')
          callback()
        }

        // TODO: should we also ensure router.isReady is true
        // by default before resolving?
        if ((window as any).__NEXT_HYDRATED) {
          console.log('Next.js page already hydrated')
          callback()
        } else {
          var timeout = setTimeout(callback, 10 * 1000)
          ;(window as any).__NEXT_HYDRATED_CB = function () {
            clearTimeout(timeout)
            console.log('Next.js hydrate callback fired')
            callback()
          }
        }
      })
    }

    try {
      await checkHydrated()
    } catch (err) {
      if (retryWaitHydration) {
        // re-try in case the page reloaded during check
        await new Promise((resolve) => setTimeout(resolve, 2000))
        await checkHydrated()
      } else {
        console.error('failed to check hydration')
        throw err
      }
    }

    console.log(`\n> Hydration complete for ${fullUrl}\n`)
  }
  return browser
}
