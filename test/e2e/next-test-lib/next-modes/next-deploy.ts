import path from 'path'
import execa from 'execa'
import fs from 'fs-extra'
import { platform } from 'os'
import { NextInstance } from './base'

export class NextDeployInstance extends NextInstance {
  private _cliOutput: string
  private _buildId: string

  public get buildId() {
    return this._buildId
  }

  public async setup() {
    if (process.env.SITE_URL) {
      process.env.NEXT_TEST_SKIP_CLEANUP = 'true'
      console.log('Using SITE_URL', process.env.SITE_URL)
      this._url = process.env.SITE_URL
      this._parsedUrl = new URL(this._url)
      this._buildId = 'build-id'
      return
    }

    await super.createTestDir()
    // We use yarn because it's better at handling local dependencies
    await execa('yarn', [], {
      cwd: this.testDir,
      stdio: 'inherit',
    })
    // ensure Netlify CLI is installed
    try {
      const res = await execa('ntl', ['--version'])
      console.log(`Using Netlify CLI version:`, res.stdout)
    } catch (_) {
      console.log(`Installing Netlify CLI`)
      await execa('npm', ['i', '-g', 'netlify-cli@latest'], {
        stdio: 'inherit',
      })
    }

    const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID || '1d5a5c76-d445-4ae5-b694-b0d3f2e2c395'

    try {
      const statRes = await execa('ntl', ['status', '--json'], { env: { NETLIFY_SITE_ID, NODE_ENV: 'production' } })
    } catch (err) {
      if (err.message.includes("You don't appear to be in a folder that is linked to a site")) {
        throw new Error(`Site is not linked. Please set "NETLIFY_AUTH_TOKEN" and "NETLIFY_SITE_ID"`)
      }
      throw err
    }

    console.log(`Deploying project at ${this.testDir}`)

    const deployRes = await execa('ntl', ['deploy', '--build', '--json'], {
      cwd: this.testDir,
      reject: false,
      env: {
        NETLIFY_SITE_ID,
        NODE_ENV: 'production',
        DISABLE_IPX: platform() === 'linux' ? undefined : '1',
      },
    })

    if (deployRes.exitCode !== 0) {
      throw new Error(`Failed to deploy project ${deployRes.stdout} ${deployRes.stderr} (${deployRes.exitCode})`)
    }
    try {
      const data = JSON.parse(deployRes.stdout)
      this._url = data.deploy_url
      console.log(`Deployed to ${this._url}`)
      this._parsedUrl = new URL(this._url)
    } catch (err) {
      console.error(err)
      throw new Error(`Failed to parse deploy output: ${deployRes.stdout}`)
    }
    this._buildId = (
      await fs.readFile(path.join(this.testDir, this.nextConfig?.distDir || '.next', 'BUILD_ID'), 'utf8')
    ).trim()
  }

  public get cliOutput() {
    return this._cliOutput || ''
  }

  public async start() {
    // no-op as the deployment is created during setup()
  }

  public async patchFile(filename: string, content: string): Promise<void> {
    throw new Error('patchFile is not available in deploy test mode')
  }
  public async readFile(filename: string): Promise<string> {
    throw new Error('readFile is not available in deploy test mode')
  }
  public async deleteFile(filename: string): Promise<void> {
    throw new Error('deleteFile is not available in deploy test mode')
  }
  public async renameFile(filename: string, newFilename: string): Promise<void> {
    throw new Error('renameFile is not available in deploy test mode')
  }
}
