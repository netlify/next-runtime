// @ts-check
// this installs and builds all the fixtures
// Needed to run before executing the integration tests
import { existsSync, readdirSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { argv } from 'node:process'
import { Transform } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { cpus } from 'node:os'
import { execaCommand } from 'execa'
import glob from 'fast-glob'
import pLimit from 'p-limit'

const fixturesDir = fileURLToPath(new URL(`./fixtures`, import.meta.url))
const fixtureFilter = argv[2] ?? ''

const limit = pLimit(Math.max(2, cpus().length / 2))
await Promise.all(
  readdirSync(fixturesDir)
    // Ignoring things like `.DS_Store`.
    .filter((fixture) => !fixture.startsWith('.'))
    // Applying the filter, if one is set.
    .filter((fixture) => !fixtureFilter || fixture.startsWith(fixtureFilter))
    .map((fixture) =>
      limit(async () => {
        console.log(`[${fixture}] Preparing fixture`)
        const cwd = join(fixturesDir, fixture)
        const publishDirectories = await glob(['**/.next', '**/.turbo'], {
          onlyDirectories: true,
          cwd,
          absolute: true,
        })
        await Promise.all(
          publishDirectories.map((dir) => rm(dir, { recursive: true, force: true })),
        )

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
