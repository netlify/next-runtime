import { existsSync } from 'node:fs'

import mockFs from 'mock-fs'

import { moveStaticAssets } from '../../src/static.js'

describe('moveStaticAssets', () => {
  afterEach(mockFs.restore)

  it('should move public assets to the staging directory', () => {
    mockFs({
      public: {
        'index.html': '<h1>Hello World</h1>',
      },
      '.next': {
        static: {
          'index.html': '<h1>Hello World</h1>',
        },
      },
    })
    moveStaticAssets('.next', '.netlify/publish')
    expect(existsSync('.netlify/publish/index.html')).toBe(true)
  })

  it('should move static assets to the staging directory', () => {
    mockFs({
      '.next': {
        static: {
          'index.html': '<h1>Hello World</h1>',
        },
      },
    })
    moveStaticAssets('.next', '.netlify/publish')
    expect(existsSync('.netlify/publish/_next/static/index.html')).toBe(true)
  })
})
