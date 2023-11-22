import { execaCommand } from 'execa'
import fg from 'fast-glob'
import { exec } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
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

/**
 * Copies a fixture to a temp folder on the system and runs the tests inside.
 * @param fixture name of the folder inside the fixtures folder
 */
export const createE2EFixture = async (fixture: string) => {
  const cwd = await mkdtemp(join(tmpdir(), 'netlify-next-runtime-'))
  let deployID: string
  let logs: string
  const _cleanup = (failure: boolean = false) => {
    if (failure) {
      console.log('\n\n\n🪵  Deploy Logs:')
      console.log(logs)
    }
    // on failures we don't delete the deploy
    return cleanup(cwd, failure === true ? undefined : deployID)
  }
  try {
    const [packageName] = await Promise.all([buildAndPackRuntime(cwd), copyFixture(fixture, cwd)])
    await installRuntime(packageName, cwd)
    const result = await deploySite(cwd)
    console.log(`🌍 Deployed Site is live under: ${result.url}`)
    deployID = result.deployID
    logs = result.logs
    return { cwd, cleanup: _cleanup, deployID: result.deployID, url: result.url }
  } catch (error) {
    await _cleanup()
    throw error
  }
}

/** Copies a fixture folder to a destination */
async function copyFixture(fixtureName: string, dest: string): Promise<void> {
  console.log(`🔨  Build Runtime...`)
  await execaCommand('npm run build')

  console.log(`📂  Copy Fixture to temp directory...`)
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
async function buildAndPackRuntime(dest: string): Promise<string> {
  console.log(`📦  Creating tarball with 'npm pack'...`)
  const { stdout } = await execaCommand(`npm pack --json --pack-destination ${dest}`)
  const [{ filename, name }] = JSON.parse(stdout)

  await writeFile(
    join(dest, 'netlify.toml'),
    `[build]
command = "next build"
publish = ".next"

[[plugins]]
package = "${name}"
`,
  )

  return filename
}

async function installRuntime(packageName: string, cwd: string): Promise<void> {
  console.log(`⚙️   Installing runtime ${packageName}...`)
  await execaCommand(`npm install --ignore-scripts --no-audit --progress=false ${packageName}`, {
    cwd,
  })
}

async function deploySite(cwd: string): Promise<DeployResult> {
  console.log(`🚀  Building and Deploying Site...`)
  const outputFile = 'deploy-output.txt'
  const cmd = `ntl deploy --build --site ${SITE_ID}`

  await execaCommand(cmd, { cwd, all: true }).pipeAll?.(join(cwd, outputFile))
  const output = await readFile(join(cwd, outputFile), 'utf-8')

  const [url] = new RegExp(/https:.+runtime-testing\.netlify\.app/gm).exec(output) || []
  if (!url) {
    throw new Error('Could not extract the URL from the build logs')
  }
  const [deployID] = new URL(url).host.split('--')
  return { url, deployID, logs: output }
}

export async function deleteDeploy(deploy_id?: string): Promise<void> {
  if (deploy_id) {
    console.log(`♻️  Delete Deploy ${deploy_id}...`)
    const cmd = `ntl api deleteDeploy --data='{"deploy_id":"${deploy_id}"}'`
    // execa mangles around with the json so let's use exec here
    return new Promise<void>((resolve, reject) =>
      exec(cmd, (err) => (err ? reject(err) : resolve())),
    )
  }
}

async function cleanup(dest: string, deployId?: string): Promise<void> {
  console.log(`🗑️  Starting Cleanup...`)
  await Promise.allSettled([deleteDeploy(deployId), rm(dest, { recursive: true, force: true })])
}
