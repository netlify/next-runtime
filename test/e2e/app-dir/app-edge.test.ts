import { createNext, FileRef } from 'e2e-utils'
import { NextInstance } from 'test/lib/next-modes/base'
import { check, renderViaHTTP, fetchViaHTTP } from 'next-test-utils'
import path from 'path'

describe('app-dir edge SSR', () => {
  if ((global as any).isNextDeploy) {
   it('should skip next deploy', () => {})
   return
  }

  let next: NextInstance

  beforeAll(async () => {
    next = await createNext({
      files: new FileRef(path.join(__dirname, 'app-edge')),
      dependencies: {
        react: 'latest',
        'react-dom': 'latest',
        typescript: 'latest',
        '@types/react': 'latest',
        '@types/node': 'latest',
      },
    })
  }, 600000)
  afterAll(() => next.destroy())

  it('should handle edge only routes', async () => {
    const appHtml = await renderViaHTTP(next.url, '/edge/basic')
    expect(appHtml).toContain('<p>Edge!</p>')

    const pageHtml = await renderViaHTTP(next.url, '/pages-edge')
    expect(pageHtml).toContain('<p>pages-edge-ssr</p>')
  })

  it('should retrieve cookies in a server component in the edge runtime', async () => {
    const res = await fetchViaHTTP(next.url, '/edge-apis/cookies')
    expect(await res.text()).toInclude('Hello')
  })

  if ((globalThis as any).isNextDev) {
    it('should handle edge rsc hmr', async () => {
      const pageFile = 'app/edge/basic/page.tsx'
      const content = await next.readFile(pageFile)

      // Update rendered content
      const updatedContent = content.replace('Edge!', 'edge-hmr')
      await next.patchFile(pageFile, updatedContent)
      await check(async () => {
        const html = await renderViaHTTP(next.url, '/edge/basic')
        return html
      }, /edge-hmr/)

      // Revert
      await next.patchFile(pageFile, content)
      await check(async () => {
        const html = await renderViaHTTP(next.url, '/edge/basic')
        return html
      }, /Edge!/)
    })
  }
})
