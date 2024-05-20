;(() => {
  const url = new URL(window.location.href)
  url.pathname = '/_next/postponed/resume'.concat(url.pathname === '/' ? '/index' : url.pathname)
  const pprData = document.querySelector('#_ppr-data')?.textContent
  const response = fetch(url.href, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-matched-path': url.pathname,
    },
    body: pprData,
  })
  window.addEventListener('load', () => {
    const navigationEntries = performance.getEntriesByType('navigation')
    if (navigationEntries.length !== 0) {
      const [navigationEntry] = navigationEntries as PerformanceNavigationTiming[]
      const ttfb = navigationEntry.responseStart
      console.log(`TTFB: ${ttfb}ms`)
      window.performance.mark('ttfb', { startTime: ttfb })
    }

    const targetElementSelector = '#B\\:4'
    const targetElement = document.querySelector(targetElementSelector)?.parentElement

    if (targetElement) {
      const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList' && mutation.removedNodes.length !== 0) {
            for (const node of mutation.removedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === 'TEMPLATE') {
                console.log('PPR resume complete')
                window.performance.mark('ppr.complete')
                observer.disconnect()
              }
            }
          }
        }
      })

      observer.observe(targetElement, { childList: true, subtree: true })
    } else {
      console.error(`Element with selector "${targetElementSelector}" not found`)
    }
  })
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded')
    window.performance.mark('ppr.shell')
    await response.then(async ({ body }) => {
      console.log('PPR resume started')
      window.performance.mark('ppr.postponed')
      if (body === null) {
        console.log('Invalid PPR resume response')
        return
      }
      const reader = body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let value
      let buffer = ''

      while (!done) {
        ;({ done, value } = await reader.read())
        if (!done) buffer += decoder.decode(value)
      }

      const range = document.createRange()
      const fragment = range.createContextualFragment(buffer)
      document.body.append(fragment)
    })
  })
})()
