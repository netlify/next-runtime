import { spawn } from 'child_process'
import { NextInstance } from './base'

export class NextDevInstance extends NextInstance {
  private _cliOutput: string

  public get buildId() {
    return 'development'
  }

  public async setup() {
    await super.createTestDir()
  }

  public get cliOutput() {
    return this._cliOutput || ''
  }

  public async start(useDirArg: boolean = false) {
    if (this.childProcess) {
      throw new Error('next already started')
    }
    let startArgs = ['yarn', 'next', useDirArg && this.testDir].filter(
      Boolean
    ) as string[]

    if (this.startCommand) {
      startArgs = this.startCommand.split(' ')
    }

    await new Promise<void>((resolve) => {
      this.childProcess = spawn(startArgs[0], startArgs.slice(1), {
        cwd: useDirArg ? process.cwd() : this.testDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        env: {
          ...process.env,
          ...this.env,
          NODE_ENV: '' as any,
          PORT: this.forcedPort || '0',
          __NEXT_TEST_MODE: '1',
          __NEXT_TEST_WITH_DEVTOOL: '1',
        },
      })

      this._cliOutput = ''

      this.childProcess.stdout.on('data', (chunk) => {
        const msg = chunk.toString()
        process.stdout.write(chunk)
        this._cliOutput += msg
        this.emit('stdout', [msg])
      })
      this.childProcess.stderr.on('data', (chunk) => {
        const msg = chunk.toString()
        process.stderr.write(chunk)
        this._cliOutput += msg
        this.emit('stderr', [msg])
      })

      this.childProcess.on('close', (code, signal) => {
        if (this.isStopping) return
        if (code || signal) {
          throw new Error(
            `next dev exited unexpectedly with code/signal ${code || signal}`
          )
        }
      })
      const readyCb = (msg) => {
        if (msg.includes('started server on') && msg.includes('url:')) {
          this._url = msg.split('url: ').pop().trim()
          this._parsedUrl = new URL(this._url)
          this.off('stdout', readyCb)
          resolve()
        }
      }
      this.on('stdout', readyCb)
    })
  }
}
