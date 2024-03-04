import { existsSync } from 'node:fs'
import { cp, mkdir } from 'node:fs/promises'

if (existsSync('apps/site')) {
  throw new Error('apps/site already exists. Run "node pre-test.mjs" to reset the test environment')
}

if (existsSync('packages/ui')) {
  throw new Error(
    'packages/ui already exists. Run "node pre-test.mjs" to reset the test environment',
  )
}

await mkdir('apps', { recursive: true })
await mkdir('packages', { recursive: true })
await cp('mock-download/apps/', 'apps', { recursive: true })
await cp('mock-download/packages/', 'packages', { recursive: true })
