import { createNextDescribe, FileRef } from 'e2e-utils'
import { NextInstance } from 'test/lib/next-modes/base'
import { check, renderViaHTTP, fetchViaHTTP } from 'next-test-utils'
import path from 'path'

createNextDescribe('app-dir edge SSR',
{
  files: new FileRef(path.join(__dirname, 'app-edge')),
  skipDeployment: true,
},
({ next }) => {
  // Was originally within app-edge-global.test.ts
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
    it('should resolve module without error in edge runtime', async () => {
      const logs = []
      next.on('stderr', (log) => {
        logs.push(log)
      })
      await renderViaHTTP(next.url,'app-edge')
      expect(
        logs.some((log) => log.includes(`Attempted import error:`))
      ).toBe(false)
    })

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
  } else {
    // Production tests
    it('should generate matchers correctly in middleware manifest', async () => {
      const manifest = JSON.parse(
        await next.readFile('.next/server/middleware-manifest.json')
      )
      expect(manifest.functions['/(group)/group/page'].matchers).toEqual([
        {
          regexp: '^/group$',
          originalSource: '/group',
        },
      ])
    })
  }
})
