import path, { dirname, relative } from 'path'
import execa from 'execa'
import fs from 'fs-extra'
import { platform } from 'os'
import { NextInstance } from './base'

type DeployResponse = {
  name: string
  site_id: string
  site_name: string
  deploy_id: string
  deploy_url: string
  logs: string
}

export class NextDeployInstance extends NextInstance {
  private _cliOutput: string
  private _buildId: string
  private _deployId: string
  private _netlifySiteId: string

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
    const testName = process.env.TEST_FILE_PATH && relative(process.cwd(), process.env.TEST_FILE_PATH)
    await super.createTestDir()
    // We use yarn because it's better at handling local dependencies
    await execa('yarn', [], {
      cwd: this.testDir,
      stdio: 'inherit',
    })
    // Netlify CLI should be installed, but just making sure
    try {
      const res = await execa('ntl', ['--version'])
      console.log(`Using Netlify CLI version:`, res.stdout)
    } catch (_) {
      throw new Error(`You need to have netlify-cli installed.
      
      You can do this by running: "npm install -g netlify-cli@latest" or "yarn global add netlify-cli@latest"`)
    }

    console.log(`Deploys site for test: ${testName}`)

    this._netlifySiteId = process.env.NETLIFY_SITE_ID || '1d5a5c76-d445-4ae5-b694-b0d3f2e2c395'

    try {
      await execa('ntl', ['status', '--json'], {
        env: { NETLIFY_SITE_ID: this._netlifySiteId, NODE_ENV: 'production' },
      })
    } catch (err) {
      if (err.message.includes("You don't appear to be in a folder that is linked to a site")) {
        throw new Error(`Site is not linked. Please set "NETLIFY_AUTH_TOKEN" and "NETLIFY_SITE_ID"`)
      }
      throw err
    }

    console.log(`Deploying project at ${this.testDir}`)

    const deployTitle = process.env.GITHUB_SHA ? `${testName} - ${process.env.GITHUB_SHA}` : testName
    const deployRes = await execa('ntl', ['deploy', '--build', '--json', '--message', deployTitle], {
      cwd: this.testDir,
      reject: false,
      env: {
        NETLIFY_SITE_ID: this._netlifySiteId,
        NODE_ENV: 'production',
        DISABLE_IPX: platform() === 'linux' ? undefined : '1',
        NEXT_KEEP_METADATA_FILES: 'true',
        NODE_OPTIONS: `--require ${require.resolve('../fetch-polyfill.js')}`
      },
    })

    if (deployRes.exitCode !== 0) {
      console.log({ deployRes})
      throw new Error(`Failed to deploy project ${deployRes.stdout} ${deployRes.stderr} (${deployRes.exitCode})`)
    }
    try {
      const data: DeployResponse = JSON.parse(deployRes.stdout)
      this._url = data.deploy_url
      this._deployId = data.deploy_id
      console.log(`Deployed to ${this._url}`, data)
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

  public async destroy(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error(`Next.js deploy instance already destroyed`)
    }

    // During setup() the test site is deployed to Netlify
    // Once testing is complete, we should delete the deploy again

    if (!process.env.NEXT_TEST_SKIP_CLEANUP) {
      console.log(`Deleting project with deploy_id ${this._deployId}`)

      const deleteResponse = await execa('ntl', ['api', 'deleteDeploy', '--data', `{ "deploy_id": "${this._deployId}" }`])
  
      if (deleteResponse.exitCode !== 0) {
        throw new Error(`Failed to delete project ${deleteResponse.stdout} ${deleteResponse.stderr} (${deleteResponse.exitCode})`)
      }

      console.log(`Successfully deleted project with deploy_id ${this._deployId}`)
    }

    // Code below is copied from the base NextInstance class

    this.isDestroyed = true
    this.emit('destroy', [])

    if (!process.env.NEXT_TEST_SKIP_CLEANUP) {
      await fs.remove(this.testDir)
    }
    require('console').log(`destroyed next instance`)
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
