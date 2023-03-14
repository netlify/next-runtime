import { removeTrailingSlash, ensureLocalePrefix } from './handlerUtils'

describe('removeTrailingSlash', () => {
  it('removes a trailing slash from a string', () => {
    expect(removeTrailingSlash('/foo/')).toEqual('/foo')
  })
  it('ignores a string without a trailing slash', () => {
    expect(removeTrailingSlash('/foo')).toEqual('/foo')
  })
  it('does not remove a slash on its own', () => {
    expect(removeTrailingSlash('/')).toEqual('/')
  })
})

describe('ensureLocalePrefix', () => {
  it('adds default locale prefix if missing', () => {
    expect(
      ensureLocalePrefix('/foo', {
        defaultLocale: 'en',
        locales: ['en', 'fr', 'de'],
      }),
    ).toEqual('/en/foo')
  })
  it('skips prefixing if locale is present', () => {
    expect(
      ensureLocalePrefix('/fr/foo', {
        defaultLocale: 'en',
        locales: ['en', 'fr', 'de'],
      }),
    ).toEqual('/fr/foo')
    expect(
      ensureLocalePrefix('/en/foo', {
        defaultLocale: 'en',
        locales: ['en', 'fr', 'de'],
      }),
    ).toEqual('/en/foo')
  })
  it('skips localization if i18n not configured', () => {
    expect(ensureLocalePrefix('/foo')).toEqual('/foo')
  })
})
