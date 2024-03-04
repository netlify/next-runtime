import { execaCommand } from 'execa'
import fg from 'fast-glob'
import { exec } from 'node:child_process'
import { existsSync } from 'node:fs'
import { appendFile, copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { env } from 'node:process'
import { fileURLToPath } from 'node:url'
import { cpus } from 'os'
import pLimit from 'p-limit'

// This is the netlify testing application
export const SITE_ID = 'ee859ce9-44a7-46be-830b-ead85e445e53'

export interface DeployResult {
  deployID: string
  url: string
  logs: string
}

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'berry'

interface E2EConfig {
  packageManger?: PackageManager
  packagePath?: string
  cwd?: string
  buildCommand?: string
  publishDirectory?: string
  smoke?: boolean
  generateNetlifyToml?: false
}

/**
 * Copies a fixture to a temp folder on the system and runs the tests inside.
 * @param fixture name of the folder inside the fixtures folder
 */
export const createE2EFixture = async (fixture: string, config: E2EConfig = {}) => {
  const isolatedFixtureRoot = await mkdtemp(join(tmpdir(), 'netlify-next-runtime-'))
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
      return cleanup(isolatedFixtureRoot, deployID)
    }
    console.log('\n\n\n🪵  Deploy logs:')
    console.log(logs)
    // on failures we don't delete the deploy
  }
  try {
    const [packageName] = await Promise.all([
      buildAndPackRuntime(config, isolatedFixtureRoot),
      copyFixture(fixture, isolatedFixtureRoot, config),
    ])
    await installRuntime(packageName, isolatedFixtureRoot, config)
    const result = await deploySite(isolatedFixtureRoot, config)
    console.log(`🌍 Deployed site is live: ${result.url}`)
    deployID = result.deployID
    logs = result.logs
    return {
      cleanup: _cleanup,
      deployID: result.deployID,
      url: result.url,
    }
  } catch (error) {
    await _cleanup(true)
    throw error
  }
}

export type Fixture = Awaited<ReturnType<typeof createE2EFixture>>

/** Copies a fixture folder to a destination */
async function copyFixture(
  fixtureName: string,
  isolatedFixtureRoot: string,
  config: E2EConfig,
): Promise<void> {
  console.log(`📂 Copying fixture to '${isolatedFixtureRoot}'...`)
  const src = fileURLToPath(
    new URL(`../${config.smoke ? `smoke/fixtures` : `fixtures`}/${fixtureName}`, import.meta.url),
  )
  const files = await fg.glob('**/*', {
    ignore: ['node_modules', '.yarn'],
    dot: true,
    cwd: src,
  })

  const limit = pLimit(Math.max(2, cpus().length))
  await Promise.all(
    files.map((file) =>
      limit(async () => {
        await mkdir(join(isolatedFixtureRoot, dirname(file)), { recursive: true })
        await copyFile(join(src, file), join(isolatedFixtureRoot, file))
      }),
    ),
  )

  await execaCommand('git init', { cwd: isolatedFixtureRoot })
}

/** Creates a tarball of the packed npm package at the provided destination */
async function buildAndPackRuntime(
  config: E2EConfig,
  isolatedFixtureRoot: string,
): Promise<string> {
  const {
    packagePath,
    cwd,
    buildCommand = 'next build',
    publishDirectory,
    generateNetlifyToml,
  } = config
  console.log(`📦 Creating tarball with 'npm pack'...`)

  const siteRelDir = cwd ?? packagePath ?? ''

  const { stdout } = await execaCommand(
    // for the e2e tests we don't need to clean up the package.json. That just creates issues with concurrency
    `npm pack --json --ignore-scripts --pack-destination ${isolatedFixtureRoot}`,
  )
  const [{ filename, name }] = JSON.parse(stdout)

  if (generateNetlifyToml !== false) {
    await appendFile(
      join(join(isolatedFixtureRoot, siteRelDir), 'netlify.toml'),
      `[build]
command = "${buildCommand}"
publish = "${publishDirectory ?? join(siteRelDir, '.next')}"

[[plugins]]
package = "${name}"
`,
    )
  }

  return filename
}

async function installRuntime(
  packageName: string,
  isolatedFixtureRoot: string,
  { packageManger = 'npm', packagePath, cwd }: E2EConfig,
): Promise<void> {
  console.log(`🐣 Installing runtime from '${packageName}'...`)

  const siteRelDir = cwd ?? packagePath ?? ''

  let workspaceRelPath: string | undefined
  let workspaceName: string | undefined
  // only add the workspace if a package.json exits in the packagePath
  // some monorepos like nx don't have a package.json in the app folder
  if (siteRelDir && existsSync(join(isolatedFixtureRoot, siteRelDir, 'package.json'))) {
    workspaceRelPath = siteRelDir
    workspaceName = JSON.parse(
      await readFile(join(isolatedFixtureRoot, siteRelDir, 'package.json'), 'utf-8'),
    ).name
  }

  let command: string | undefined
  let env = {} as NodeJS.ProcessEnv

  if (packageManger !== 'npm') {
    await rm(join(isolatedFixtureRoot, 'package-lock.json'), { force: true })
  }

  switch (packageManger) {
    case 'npm':
      command = `npm install --ignore-scripts --no-audit ${packageName} ${
        workspaceRelPath ? `-w ${workspaceRelPath}` : ''
      }`
      break
    case 'yarn':
      command = `yarn ${workspaceName ? `workspace ${workspaceName}` : ''} add file:${join(
        isolatedFixtureRoot,
        packageName,
      )} --ignore-scripts`
      break
    case 'berry':
      command = `yarn ${workspaceName ? `workspace ${workspaceName}` : ''} add ${join(
        isolatedFixtureRoot,
        packageName,
      )}`
      env['YARN_ENABLE_SCRIPTS'] = 'false'
      break
    case 'pnpm':
      command = `pnpm add file:${join(isolatedFixtureRoot, packageName)} ${
        workspaceRelPath ? `--filter ./${workspaceRelPath}` : ''
      } --ignore-scripts`
      break
    case 'bun':
      command = `bun install ./${packageName}`
      break
    default:
      throw new Error(`Unsupported package manager: ${packageManger}`)
  }

  await execaCommand(command, { cwd: isolatedFixtureRoot, env })

  if (packageManger === 'npm' && workspaceRelPath) {
    // installing package in npm workspace doesn't install root level packages, so we additionally install those
    await execaCommand(`npm install --ignore-scripts --no-audit`, { cwd: isolatedFixtureRoot })
  }
}

async function deploySite(
  isolatedFixtureRoot: string,
  { packagePath, cwd = '' }: E2EConfig,
): Promise<DeployResult> {
  console.log(`🚀 Building and deploying site...`)

  const outputFile = 'deploy-output.txt'
  let cmd = `ntl deploy --build --site ${SITE_ID}`

  if (packagePath) {
    cmd += ` --filter ${packagePath}`
  }

  const siteDir = join(isolatedFixtureRoot, cwd)
  await execaCommand(cmd, { cwd: siteDir, all: true }).pipeAll?.(join(siteDir, outputFile))
  const output = await readFile(join(siteDir, outputFile), 'utf-8')

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

export const fixtureFactories = {
  simpleNextApp: () => createE2EFixture('simple-next-app'),
  simpleNextAppDistDir: () =>
    createE2EFixture('simple-next-app-dist-dir', {
      publishDirectory: 'cool/output',
    }),
  simpleNextAppYarn: () => createE2EFixture('simple-next-app', { packageManger: 'yarn' }),
  simpleNextAppPNPM: () => createE2EFixture('simple-next-app-pnpm', { packageManger: 'pnpm' }),
  simpleNextAppBun: () => createE2EFixture('simple-next-app', { packageManger: 'bun' }),
  middleware: () => createE2EFixture('middleware'),
  pageRouter: () => createE2EFixture('page-router'),
  pageRouterBasePathI18n: () => createE2EFixture('page-router-base-path-i18n'),
  turborepo: () =>
    createE2EFixture('turborepo', {
      packageManger: 'pnpm',
      packagePath: 'apps/page-router',
      buildCommand: 'turbo build --filter page-router',
    }),
  turborepoNPM: () =>
    createE2EFixture('turborepo-npm', {
      packageManger: 'npm',
      packagePath: 'apps/page-router',
      buildCommand: 'turbo build --filter page-router',
    }),
  serverComponents: () => createE2EFixture('server-components'),
  nxIntegrated: () =>
    createE2EFixture('nx-integrated', {
      packageManger: 'pnpm',
      packagePath: 'apps/next-app',
      buildCommand: 'nx run next-app:build',
      publishDirectory: 'dist/apps/next-app/.next',
    }),
  nxIntegratedDistDir: () =>
    createE2EFixture('nx-integrated', {
      packageManger: 'pnpm',
      packagePath: 'apps/custom-dist-dir',
      buildCommand: 'nx run custom-dist-dir:build',
      publishDirectory: 'dist/apps/custom-dist-dir/dist',
    }),
  yarnMonorepoWithPnpmLinker: () =>
    createE2EFixture('yarn-monorepo-with-pnpm-linker', {
      packageManger: 'berry',
      packagePath: 'apps/site',
      buildCommand: 'yarn build',
      publishDirectory: 'apps/site/.next',
      smoke: true,
    }),
  npmMonorepoEmptyBaseNoPackagePath: () =>
    createE2EFixture('npm-monorepo-empty-base', {
      cwd: 'apps/site',
      buildCommand: 'npm run build',
      publishDirectory: 'apps/site/.next',
      smoke: true,
      generateNetlifyToml: false,
    }),
  npmMonorepoSiteCreatedAtBuild: () =>
    createE2EFixture('npm-monorepo-site-created-at-build', {
      buildCommand: 'npm run build',
      publishDirectory: 'apps/site/.next',
      smoke: true,
      generateNetlifyToml: false,
    }),
}
