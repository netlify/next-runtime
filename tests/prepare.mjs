// @ts-check
// this installs and builds all the fixtures
// Needed to run before executing the integration tests
import { execaCommand } from 'execa'
import { existsSync, readdirSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cpus } from 'node:os'
import pLimit from 'p-limit'
import { Transform } from 'node:stream'

const fixturesDir = fileURLToPath(new URL(`./fixtures`, import.meta.url))

const limit = pLimit(Math.max(2, cpus().length))
await Promise.all(
  readdirSync(fixturesDir)
    // Ignoring things like `.DS_Store`.
    .filter((fixture) => !fixture.startsWith('.'))
    .map((fixture) =>
      limit(async () => {
        console.log(`[${fixture}] Preparing fixture`)
        await rm(join(fixturesDir, fixture, '.next'), { recursive: true, force: true })
        const cwd = join(fixturesDir, fixture)

        // npm is the default
        let cmd = `npm install --no-audit --progress=false --prefer-offline`

        if (existsSync(join(cwd, 'pnpm-lock.yaml'))) {
          cmd = `pnpm install --reporter=silent`
        }

        const addPrefix = new Transform({
          transform(chunk, encoding, callback) {
            this.push(chunk.toString().replace(/\n/gm, `\n[${fixture}] `))
            callback()
          },
        })

        const output = execaCommand(cmd, {
          cwd,
          stdio: 'pipe',
          env: { ...process.env, FORCE_COLOR: '1' },
        })
        if (process.env.DEBUG) {
          output.stdout?.pipe(addPrefix).pipe(process.stdout)
        }
        output.stderr?.pipe(addPrefix).pipe(process.stderr)

        return output
      }),
    ),
)
