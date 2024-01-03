import http from 'node:http'
import { AddressInfo } from 'node:net'

export type LocalServerHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
) => Promise<void>

/**
 * A basic HTTP server to use in tests. It accepts a handler that responds to
 * all requests and keeps track of how many times it's called.
 */
export class LocalServer {
  calls: number
  port: number
  running: boolean
  server: http.Server

  constructor(handler?: LocalServerHandler, port?: number) {
    this.calls = 0
    this.port = port ?? 0
    this.running = false
    this.server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
      this.calls++

      if (handler !== undefined) {
        await handler(req, res)
      }
    })
  }

  static async run(handler?: LocalServerHandler, port?: number) {
    const server = new LocalServer(handler, port)

    await server.start()

    return server
  }

  async start() {
    return new Promise<AddressInfo>((resolve, reject) => {
      this.server.listen(this.port, () => {
        this.running = true

        const address = this.server.address()

        if (!address || typeof address === 'string') {
          return reject(new Error('Server cannot be started on a pipe or Unix socket'))
        }

        this.port = address.port

        resolve(address)
      })
    })
  }

  async stop() {
    if (!this.running) {
      return
    }

    return new Promise<void>((resolve, reject) => {
      this.server.close((error?: NodeJS.ErrnoException) => {
        if (error) {
          return reject(error)
        }

        resolve()
      })
    })
  }

  get url() {
    return `http://0.0.0.0:${this.port}`
  }
}
