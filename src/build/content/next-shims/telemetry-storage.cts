import type { Telemetry } from 'next/dist/telemetry/storage.js'

type PublicOf<T> = { [K in keyof T]: T[K] }

export class TelemetryShim implements PublicOf<Telemetry> {
  sessionId = 'shim'

  get anonymousId(): string {
    return 'shim'
  }

  get salt(): string {
    return 'shim'
  }

  setEnabled(): string | null {
    return null
  }

  get isEnabled(): boolean {
    return false
  }

  oneWayHash(): string {
    return 'shim'
  }

  record(): Promise<{
    isFulfilled: boolean
    isRejected: boolean
    value?: unknown
    reason?: unknown
  }> {
    return Promise.resolve({ isFulfilled: true, isRejected: false })
  }

  flush(): Promise<
    { isFulfilled: boolean; isRejected: boolean; value?: unknown; reason?: unknown }[] | null
  > {
    return Promise.resolve(null)
  }

  flushDetached(): void {
    // no-op
  }
}
