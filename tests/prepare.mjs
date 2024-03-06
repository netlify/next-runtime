// @ts-check
// this installs and builds all the fixtures
// Needed to run before executing the integration tests
import { existsSync, readdirSync } from 'node:fs'
import { rm, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { argv } from 'node:process'
import { Transform } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { cpus } from 'node:os'
import { execaCommand } from 'execa'
import glob from 'fast-glob'
import pLimit from 'p-limit'
import { valid, satisfies } from 'semver'

const NEXT_VERSION = process.env.NEXT_VERSION ?? 'latest'

const fixturesDir = fileURLToPath(new URL(`./fixtures`, import.meta.url))
const fixtureFilter = argv[2] ?? ''

async function updateNextVersions(cwd, version, fixture) {
  console.log(`[${fixture}] ▲  Updating 'next' version to '${version}'...`)
  const packageJsons = await glob(['**/package.json', '!**/node_modules'], {
    cwd,
    absolute: true,
  })

  const isSemver = valid(version)

  await Promise.all(
    packageJsons.map(async (packageJsonPath) => {
      try {
        const data = await readFile(packageJsonPath, 'utf8')
        const packageJson = JSON.parse(data)
        if (packageJson.dependencies?.next) {
          const minimumVersion = packageJson.test?.dependencies?.next
          if (isSemver && minimumVersion && !satisfies(version, minimumVersion)) {
            console.log(
              `⏩ Skipping '${packageJson.name}' because it requires next@${minimumVersion}`,
            )
            return
          }
          packageJson.dependencies.next = version
          await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
        }
      } catch (e) {
        console.error(`Error updating ${packageJsonPath}`, e)
        throw e
      }
    }),
  )
  console.log(`[${fixture}] ▲  Updated to next@${version}`)
}

const limit = pLimit(Math.max(2, cpus().length / 2))
const fixtures = readdirSync(fixturesDir)
  // Ignoring things like `.DS_Store`.
  .filter((fixture) => !fixture.startsWith('.'))
  // Applying the filter, if one is set.
  .filter((fixture) => !fixtureFilter || fixture.startsWith(fixtureFilter))
console.log(`🧪 Preparing fixtures: ${fixtures.join(', ')}`)
const fixtureList = new Set(fixtures)
const fixtureCount = fixtures.length
const promises = fixtures.map((fixture) =>
  limit(async () => {
    console.log(`[${fixture}] Preparing fixture`)
    const cwd = join(fixturesDir, fixture)
    const publishDirectories = await glob(['**/.next', '**/.turbo'], {
      onlyDirectories: true,
      cwd,
      absolute: true,
    })
    await Promise.all(publishDirectories.map((dir) => rm(dir, { recursive: true, force: true })))

    if (NEXT_VERSION !== 'latest') {
      console.log(`[${fixture}] Updating Next.js to ${NEXT_VERSION}`)
      await updateNextVersions(cwd, NEXT_VERSION, fixture)
    }

    // npm is the default
    let cmd = `npm install --no-audit --progress=false --prefer-offline `

    if (existsSync(join(cwd, 'pnpm-lock.yaml'))) {
      // We disable frozen-lockfile because we may have changed the version of Next.js
      cmd = `pnpm install --frozen-lockfile=false --force ${
        process.env.DEBUG || NEXT_VERSION !== 'latest' ? '' : '--reporter silent'
      }`
    }

    const addPrefix = new Transform({
      transform(chunk, encoding, callback) {
        this.push(chunk.toString().replace(/\n/gm, `\n[${fixture}] `))
        callback()
      },
    })
    console.log(`[${fixture}] Running \`${cmd}\`...`)
    const output = execaCommand(cmd, {
      cwd,
      stdio: 'pipe',
      env: { ...process.env, FORCE_COLOR: '1' },
    })
    if (process.env.DEBUG) {
      output.stdout?.pipe(addPrefix).pipe(process.stdout)
    }
    output.stderr?.pipe(addPrefix).pipe(process.stderr)
    output.finally(async () => {
      fixtureList.delete(fixture)

      console.log(
        `[${fixture}] Done. ${limit.pendingCount + limit.activeCount}/${fixtureCount} remaining.`,
      )
      if (limit.activeCount < 5 && limit.activeCount > 0) {
        console.log(`[${fixture}] Waiting for ${Array.from(fixtureList).join(', ')}`)
      }
    })
    return output
  }),
)
await Promise.allSettled(promises)
console.log('🎉 All fixtures prepared')
