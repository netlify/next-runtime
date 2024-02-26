import { execaCommand } from 'execa'
import fg from 'fast-glob'
import { exec } from 'node:child_process'
import { existsSync } from 'node:fs'
import { appendFile, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { env } from 'node:process'
import { fileURLToPath } from 'node:url'
import { cpus } from 'os'
import pLimit from 'p-limit'
import { test as base, PlaywrightWorkerArgs, WorkerFixture } from '@playwright/test'
import { ArgumentsType } from 'vitest'

// This is the netlify testing application
export const SITE_ID = 'ee859ce9-44a7-46be-830b-ead85e445e53'

export interface DeployResult {
  deployID: string
  url: string
  logs: string
}

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'berry'

/**
 * Copies a fixture to a temp folder on the system and runs the tests inside.
 * @param fixture name of the folder inside the fixtures folder
 */
export const createE2EFixture = async (
  fixture: string,
  config: {
    packageManger?: PackageManager
    packagePath?: string
    buildCommand?: string
    publishDirectory?: string
    smoke?: boolean
  } = {},
) => {
  const cwd = await mkdtemp(join(tmpdir(), 'netlify-next-runtime-'))
  let deployID: string
  let logs: string
  const _cleanup = (failure: boolean = false) => {
    if (env.E2E_PERSIST) {
      console.log(
        `💾 Fixture and deployed site have been persisted. To clean up automatically, run tests without the 'E2E_PERSIST' environment variable.`,
      )

      return
    }

    if (!failure) {
      return cleanup(cwd, deployID)
    }
    console.log('\n\n\n🪵  Deploy logs:')
    console.log(logs)
    // on failures we don't delete the deploy
  }
  try {
    const [packageName] = await Promise.all([
      buildAndPackRuntime({ ...config, dest: cwd }),
      copyFixture(fixture, cwd, config),
    ])
    await installRuntime(packageName, cwd, config.packageManger || 'npm', config.packagePath)
    const result = await deploySite(cwd, config.packagePath)
    console.log(`🌍 Deployed site is live: ${result.url}`)
    deployID = result.deployID
    logs = result.logs
    return { cwd, cleanup: _cleanup, deployID: result.deployID, url: result.url }
  } catch (error) {
    await _cleanup(true)
    throw error
  }
}

export type Fixture = Awaited<ReturnType<typeof createE2EFixture>>

/** Copies a fixture folder to a destination */
async function copyFixture(
  fixtureName: string,
  dest: string,
  config: Parameters<typeof createE2EFixture>[1],
): Promise<void> {
  console.log(`📂 Copying fixture to '${dest}'...`)
  const src = fileURLToPath(
    new URL(`../${config?.smoke ? `smoke-fixtures` : `fixtures`}/${fixtureName}`, import.meta.url),
  )
  const files = await fg.glob('**/*', {
    ignore: ['node_modules'],
    dot: true,
    cwd: src,
  })

  const limit = pLimit(Math.max(2, cpus().length))
  await Promise.all(
    files.map((file) =>
      limit(async () => {
        await mkdir(join(dest, dirname(file)), { recursive: true })
        await copyFile(join(src, file), join(dest, file))
      }),
    ),
  )
}

/** Creates a tarball of the packed npm package at the provided destination */
async function buildAndPackRuntime(config: {
  dest: string
  packagePath?: string
  buildCommand?: string
  publishDirectory?: string
}): Promise<string> {
  const { dest, packagePath = '', buildCommand = 'next build', publishDirectory } = config
  console.log(`📦 Creating tarball with 'npm pack'...`)

  const { stdout } = await execaCommand(
    // for the e2e tests we don't need to clean up the package.json. That just creates issues with concurrency
    `npm pack --json --ignore-scripts --pack-destination ${dest}`,
  )
  const [{ filename, name }] = JSON.parse(stdout)

  await appendFile(
    join(join(dest, packagePath), 'netlify.toml'),
    `[build]
command = "${buildCommand}"
publish = "${publishDirectory ?? join(packagePath, '.next')}"

[[plugins]]
package = "${name}"
`,
  )

  return filename
}

async function installRuntime(
  packageName: string,
  cwd: string,
  packageManger: PackageManager,
  packagePath?: string,
): Promise<void> {
  console.log(`🐣 Installing runtime from '${packageName}'...`)

  let filter = ''
  // only add the filter if a package.json exits in the packagePath
  // some monorepos like nx don't have a package.json in the app folder
  if (packagePath && existsSync(join(cwd, packagePath, 'package.json'))) {
    filter = `--filter ./${packagePath}`
  }

  let command: string = `npm install --ignore-scripts --no-audit ${packageName}`
  let env = {} as NodeJS.ProcessEnv

  switch (packageManger) {
    case 'yarn':
      command = `yarn add file:${join(cwd, packageName)} --ignore-scripts`
      break
    case 'berry':
      command = `yarn add ${join(cwd, packageName)}`
      env['YARN_ENABLE_SCRIPTS'] = 'false'
      break
    case 'pnpm':
      command = `pnpm add file:${join(cwd, packageName)} ${filter} --ignore-scripts`
      break
    case 'bun':
      command = `bun install ./${packageName}`
      break
  }

  if (packageManger !== 'npm') {
    await rm(join(cwd, 'package-lock.json'), { force: true })
  }

  await execaCommand(command, { cwd, env })
}

async function deploySite(cwd: string, packagePath?: string): Promise<DeployResult> {
  console.log(`🚀 Building and deploying site...`)

  const outputFile = 'deploy-output.txt'
  let cmd = `ntl deploy --build --site ${SITE_ID}`

  if (packagePath) {
    cmd += ` --filter ${packagePath}`
  }

  await execaCommand(cmd, { cwd, all: true }).pipeAll?.(join(cwd, outputFile))
  const output = await readFile(join(cwd, outputFile), 'utf-8')

  const [url] = new RegExp(/https:.+runtime-testing\.netlify\.app/gm).exec(output) || []
  if (!url) {
    throw new Error('Could not extract the URL from the build logs')
  }
  const [deployID] = new URL(url).host.split('--')
  return { url, deployID, logs: output }
}

export async function deleteDeploy(deployID?: string): Promise<void> {
  if (!deployID) {
    return
  }

  const cmd = `ntl api deleteDeploy --data='{"deploy_id":"${deployID}"}'`
  // execa mangles around with the json so let's use exec here
  return new Promise<void>((resolve, reject) => exec(cmd, (err) => (err ? reject(err) : resolve())))
}

async function cleanup(dest: string, deployId?: string): Promise<void> {
  console.log(`🧹 Cleaning up fixture and deployed site...`)
  console.log(
    `  - To persist them for further inspection, run the tests with the 'E2E_PERSIST' environment variable`,
  )

  await Promise.allSettled([deleteDeploy(deployId), rm(dest, { recursive: true, force: true })])
}

const makeE2EFixture = (
  ...args: ArgumentsType<typeof createE2EFixture>
): [WorkerFixture<Fixture, PlaywrightWorkerArgs>, { scope: 'worker' }] => [
  async ({}, use) => {
    const fixture = await createE2EFixture(...args)
    await use(fixture)
    await fixture.cleanup(false) // TODO: replace false with info about test results
  },
  { scope: 'worker' },
]

export const test = base.extend<
  { takeScreenshot: void },
  {
    simpleNextApp: Fixture
    simpleNextAppDistDir: Fixture
    simpleNextAppYarn: Fixture
    simpleNextAppPNPM: Fixture
    simpleNextAppBun: Fixture
    middleware: Fixture
    pageRouter: Fixture
    pageRouterBasePathI18n: Fixture
    nxIntegrated: Fixture
    nxIntegratedDistDir: Fixture
    turborepo: Fixture
    turborepoNPM: Fixture
    serverComponents: Fixture
    yarnMonorepoWithPnpmLinker: Fixture
  }
>({
  simpleNextApp: makeE2EFixture('simple-next-app'),
  simpleNextAppDistDir: makeE2EFixture('simple-next-app-dist-dir', {
    publishDirectory: 'cool/output',
  }),
  simpleNextAppYarn: makeE2EFixture('simple-next-app', { packageManger: 'yarn' }),
  simpleNextAppPNPM: makeE2EFixture('simple-next-app-pnpm', { packageManger: 'pnpm' }),
  simpleNextAppBun: makeE2EFixture('simple-next-app', { packageManger: 'bun' }),
  middleware: makeE2EFixture('middleware'),
  pageRouter: makeE2EFixture('page-router'),
  pageRouterBasePathI18n: makeE2EFixture('page-router-base-path-i18n'),
  turborepo: makeE2EFixture('turborepo', {
    packageManger: 'pnpm',
    packagePath: 'apps/page-router',
    buildCommand: 'turbo build --filter page-router',
  }),
  turborepoNPM: makeE2EFixture('turborepo-npm', {
    packageManger: 'npm',
    packagePath: 'apps/page-router',
    buildCommand: 'turbo build --filter page-router',
  }),
  serverComponents: makeE2EFixture('server-components'),
  nxIntegrated: makeE2EFixture('nx-integrated', {
    packageManger: 'pnpm',
    packagePath: 'apps/next-app',
    buildCommand: 'nx run next-app:build',
    publishDirectory: 'dist/apps/next-app/.next',
  }),
  nxIntegratedDistDir: makeE2EFixture('nx-integrated', {
    packageManger: 'pnpm',
    packagePath: 'apps/custom-dist-dir',
    buildCommand: 'nx run custom-dist-dir:build',
    publishDirectory: 'dist/apps/custom-dist-dir/dist',
  }),
  yarnMonorepoWithPnpmLinker: makeE2EFixture('yarn-monorepo-with-pnpm-linker', {
    packageManger: 'berry',
    packagePath: 'apps/site',
    buildCommand: 'yarn build',
    publishDirectory: 'apps/site/.next',
    smoke: true,
  }),
  takeScreenshot: [
    async ({ page }, use, testInfo) => {
      await use()

      if (testInfo.status !== testInfo.expectedStatus) {
        const screenshotPath = testInfo.outputPath(`failure.png`)
        // Add it to the report to see the failure immediately
        testInfo.attachments.push({
          name: 'failure',
          path: screenshotPath,
          contentType: 'image/png',
        })
        await page.screenshot({ path: screenshotPath, timeout: 5000 })
      }
    },
    { auto: true },
  ],
})
