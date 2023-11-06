// this installs and builds all the fixtures
// Needed to run before executing the integration tests
import { execaCommand } from 'execa'
import { readdirSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const fixturesDir = fileURLToPath(new URL(`./fixtures`, import.meta.url))

console.log('Preparing test fixtures:')
await Promise.all(
  readdirSync(fixturesDir).map(async (fixture) => {
    console.log(`◆ Preparing fixture: ${fixture}`)
    await rm(join(fixturesDir, fixture, '.next'), { recursive: true, force: true })
    return execaCommand(`npm install --no-audit --progress=false --prefer-offline`, {
      cwd: join(fixturesDir, fixture),
    })
  }),
)
