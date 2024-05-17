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
  document.addEventListener('DOMContentLoaded', async () => {
    await response.then(async ({ body }) => {
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
