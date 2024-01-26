import { Buffer } from 'node:buffer'

import { expect, describe, it } from 'vitest'

import { encodeBlobKey } from './blobkey.js'

describe('encodeBlobKey', () => {
  it('ignores leading slashes', async () => {
    expect(await encodeBlobKey('/foo')).toEqual(await encodeBlobKey('foo'))
  })

  const longKey = 'long'.repeat(100)

  it('truncates long keys to 180 characters', async () => {
    expect(await encodeBlobKey(longKey)).toHaveLength(180)
  })

  it('truncated keys also ignore leading slashes', async () => {
    expect(await encodeBlobKey(`/${longKey}`)).toEqual(await encodeBlobKey(longKey))
  })

  it('adds a differentiating hash to truncated keys', async () => {
    expect(await encodeBlobKey(`${longKey}a`)).not.toEqual(await encodeBlobKey(`${longKey}b`))
  })

  it('truncated keys keep having a readable start', async () => {
    const key = await encodeBlobKey(`/products/${longKey}`)
    expect(Buffer.from(key, 'base64url').toString().startsWith('products/')).toBe(true)
  })
})
