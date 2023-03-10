import { getPathsForRoute, localizeRoute } from './handlerUtils'

describe('getPathsForRoute', () => {
  it('transforms / (root level) data routes to /index', () => {
    expect(getPathsForRoute('/', 'buildId')).toContainEqual(expect.stringMatching(/index.json/))
  })
  it('removes the trailing slash from data routes', () => {
    expect(getPathsForRoute('/foo/', 'buildId')).toContainEqual(expect.stringMatching(/foo.json$/))
  })
  it('respects the trailing slash for rsc routes', () => {
    expect(getPathsForRoute('/foo', 'buildId')).toContainEqual(expect.stringMatching(/foo.rsc$/))
    expect(getPathsForRoute('/foo/', 'buildId')).toContainEqual(expect.stringMatching(/foo.rsc\/$/))
  })
})

describe('localizeRoute', () => {
  it('returns a non-localized path for the default locale', () => {
    expect(
      localizeRoute('/foo', {
        defaultLocale: 'en',
        locales: ['en', 'fr', 'de'],
      }),
    ).toContain('/foo')
  })
  it('returns a localized path for each non-default locale', () => {
    expect(
      localizeRoute('/foo', {
        defaultLocale: 'en',
        locales: ['en', 'fr', 'de'],
      }),
    ).toEqual(expect.arrayContaining(['/fr/foo', '/de/foo']))
  })
  it('returns every locale for data routes', () => {
    expect(
      localizeRoute(
        '/foo',
        {
          defaultLocale: 'en',
          locales: ['en', 'fr', 'de'],
        },
        true,
      ),
    ).toEqual([
      expect.stringMatching(/\/en\/foo/),
      expect.stringMatching(/\/fr\/foo/),
      expect.stringMatching(/\/de\/foo/),
    ])
  })
  it('skips localization if i18n not configured', () => {
    expect(localizeRoute('/foo')).toEqual(['/foo'])
  })
})
