import { execaCommand } from 'execa'
import fg from 'fast-glob'
import { exec } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
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

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'

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
      buildAndPackRuntime(cwd, config.packagePath, config.buildCommand),
      copyFixture(fixture, cwd),
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

/** Copies a fixture folder to a destination */
async function copyFixture(fixtureName: string, dest: string): Promise<void> {
  console.log(`📂 Copying fixture to '${dest}'...`)
  const src = fileURLToPath(new URL(`../fixtures/${fixtureName}`, import.meta.url))
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
async function buildAndPackRuntime(
  dest: string,
  packagePath: string = '',
  buildCommand = 'next build',
): Promise<string> {
  console.log(`🔨 Building runtime...`, process.cwd())
  await execaCommand('npm run build')

  console.log(`📦 Creating tarball with 'npm pack'...`)

  const { stdout } = await execaCommand(
    // for the e2e tests we don't need to clean up the package.json. That just creates issues with concurrency
    `npm pack --json --ignore-scripts --pack-destination ${dest}`,
  )
  const [{ filename, name }] = JSON.parse(stdout)

  await writeFile(
    join(join(dest, packagePath), 'netlify.toml'),
    `[build]
command = "${buildCommand}"
publish = "${join(packagePath, '.next')}"

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

  let command: string = `npm install --ignore-scripts --no-audit ${packageName}`

  switch (packageManger) {
    case 'yarn':
      command = `yarn add file:${join(cwd, packageName)} --ignore-scripts`
      break
    case 'pnpm':
      command = `pnpm add file:${join(cwd, packageName)} ${
        packagePath ? `--filter ./${packagePath}` : ''
      } --ignore-scripts`
      break
    case 'bun':
      command = `bun install ./${packageName}`
      break
  }

  if (packageManger !== 'npm') {
    await rm(join(cwd, 'package-lock.json'), { force: true })
  }

  await execaCommand(command, { cwd })
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
