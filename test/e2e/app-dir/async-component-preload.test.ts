import { createNextDescribe, FileRef } from 'e2e-utils'
import { NextInstance } from 'test/lib/next-modes/base'
import webdriver from 'next-webdriver'
import path from 'path'

createNextDescribe('async-component-preload',
{
  files: new FileRef(path.join(__dirname, 'async-component-preload')),
  skipDeployment: true,
}, ({next}) => {
  it('should handle redirect in an async page', async () => {
    const browser = await webdriver(next.url, '/')
    expect(await browser.waitForElementByCss('#success').text()).toBe('Success')
  })
})
