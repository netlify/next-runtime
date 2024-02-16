import { afterEach, vi } from 'vitest'
import { FixtureTestContext } from './utils/fixture'
import fs from 'node:fs'

// cleanup after each test as a fallback if someone forgot to call it
afterEach<FixtureTestContext>(async ({ cleanup }) => {
  if ('reset' in fs) {
    ;(fs as any).reset()
  }

  const jobs = (cleanup ?? []).map((job) => job())

  await Promise.all(jobs)
})
