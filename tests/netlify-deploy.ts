// This is copied to the Next.js repo
import execa from 'execa'
import fs from 'fs-extra'
import { Span } from 'next/src/trace'
import path from 'path'
import { NextInstance } from './base'

type NetlifyDeployResponse = {
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

  public get buildId() {
    // get deployment ID via fetch since we can't access
    // build artifacts directly
    return this._buildId
  }

  public async setup(parentSpan: Span) {
    // create the test site
    await super.createTestDir({ parentSpan, skipInstall: true })

    // If the test fixture has node modules we need to move them aside then merge them in after

    const nodeModules = path.join(this.testDir, 'node_modules')
    const nodeModulesBak = `${nodeModules}.bak`

    if (fs.existsSync(nodeModules)) {
      await fs.rename(nodeModules, nodeModulesBak)
    }

    // install dependencies
    await execa('npm', ['i'], {
      cwd: this.testDir,
      stdio: 'inherit',
    })

    if (fs.existsSync(nodeModulesBak)) {
      // move the contents of the fixture node_modules into the installed modules
      for (const file of await fs.readdir(nodeModulesBak)) {
        await fs.move(path.join(nodeModulesBak, file), path.join(nodeModules, file), {
          overwrite: true,
        })
      }
    }

    // use next runtime package installed by the test runner
    if (!fs.existsSync(path.join(this.testDir, 'netlify.toml'))) {
      const toml = /* toml */ `
          [build]
          command = "npm run build"
          publish = ".next"
          
          [[plugins]]
          package = "${path.relative(
            this.testDir,
            process.env.RUNTIME_DIR || `${process.cwd()}/../next-runtime-minimal`,
          )}"
          `

      await fs.writeFile(path.join(this.testDir, 'netlify.toml'), toml)
    }

    // ensure netlify cli is installed
    try {
      const res = await execa('netlify', ['--version'])
      require('console').log(`Using Netlify CLI version:`, res.stdout)
    } catch (_) {
      require('console').log(`You need to have netlify-cli installed.
      
      You can do this by running: "npm install -g netlify-cli@latest" or "yarn global add netlify-cli@latest"`)
    }

    // ensure project is linked
    try {
      await execa('ntl', ['status', '--json'])
    } catch (err) {
      if (err.message.includes("You don't appear to be in a folder that is linked to a site")) {
        throw new Error(`Site is not linked. Please set "NETLIFY_AUTH_TOKEN" and "NETLIFY_SITE_ID"`)
      }
      throw err
    }

    require('console').log(`Deploying project at ${this.testDir}`)

    const testName =
      process.env.TEST_FILE_PATH && path.relative(process.cwd(), process.env.TEST_FILE_PATH)

    const deployTitle = process.env.GITHUB_SHA
      ? `${testName} - ${process.env.GITHUB_SHA}`
      : testName

    const deployRes = await execa(
      'ntl',
      ['deploy', '--build', '--json', '--message', deployTitle ?? ''],
      {
        cwd: this.testDir,
        reject: false,
      },
    )

    if (deployRes.exitCode !== 0) {
      throw new Error(
        `Failed to deploy project ${deployRes.stdout} ${deployRes.stderr} (${deployRes.exitCode})`,
      )
    }

    try {
      const data: NetlifyDeployResponse = JSON.parse(deployRes.stdout)
      this._url = data.deploy_url
      this._parsedUrl = new URL(this._url)
      this._deployId = data.deploy_id
      require('console').log(`Deployment URL: ${this._url}`)
    } catch (err) {
      console.error(err)
      throw new Error(`Failed to parse deploy output: ${deployRes.stdout}`)
    }

    this._buildId = (
      await fs.readFile(
        path.join(this.testDir, this.nextConfig?.distDir || '.next', 'BUILD_ID'),
        'utf8',
      )
    ).trim()

    require('console').log(`Got buildId: ${this._buildId}`)
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
