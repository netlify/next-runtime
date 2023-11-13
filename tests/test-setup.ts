import { afterEach, vi } from 'vitest'
import { FixtureTestContext } from './utils/fixture'
import { fsCpHelper, rmHelper } from './utils/fs-helper.js'

// cleanup after each test as a fallback if someone forgot to call it
afterEach<FixtureTestContext>(async ({ cleanup }) => {
  if (typeof cleanup === 'function') {
    await cleanup()
  }
})
