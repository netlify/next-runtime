import { rm } from 'node:fs/promises'

console.log('running pre-test.mjs')
// ensure we don't have monorepo setup before starting deploy
await rm('apps', { force: true, recursive: true })
await rm('packages', { force: true, recursive: true })
