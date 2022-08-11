import Chance from 'chance'
import { getCustomImageResponseHeaders } from '../../plugin/src/helpers/utils'

const chance = new Chance()

describe('getCustomImageResponseHeaders', () => {
  it('returns null when no custom image response headers are found', () => {
    const mockHeaders = [{
      for: '/test',
      values: {
        'X-Foo': chance.string()
      }
    }]

    expect(getCustomImageResponseHeaders(mockHeaders)).toBe(null)
  })

  it('returns header values when custom image response headers are found', () => {
    const mockFooValue = chance.string()

    const mockHeaders = [{
      for: '/_next/image/',
      values: {
        'X-Foo': mockFooValue
      }
    }]

    const result = getCustomImageResponseHeaders(mockHeaders)
    expect(result).toStrictEqual({
      'X-Foo': mockFooValue,
    })
  })
})
