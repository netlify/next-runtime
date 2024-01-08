const systemLogTag = '__nfSystemLog'

const serializeError = (error: Error): Record<string, unknown> => {
  const cause = error?.cause instanceof Error ? serializeError(error.cause) : error.cause

  return {
    error: error.message,
    error_cause: cause,
    error_stack: error.stack,
  }
}

export class StructuredLogger {
  private fields: Record<string, unknown>
  private message: string

  constructor(message?: string, fields?: Record<string, unknown>) {
    this.fields = fields ?? {}
    this.message = message ?? ''
  }

  // TODO: add sampling
  private doLog(logger: typeof console.log, message: string) {
    logger(systemLogTag, JSON.stringify({ msg: message, fields: this.fields }))
  }

  log(message: string) {
    this.doLog(console.log, message)
  }

  info(message: string) {
    this.doLog(console.info, message)
  }

  debug(message: string) {
    this.doLog(console.debug, message)
  }

  warn(message: string) {
    this.doLog(console.warn, message)
  }

  error(message: string) {
    this.doLog(console.error, message)
  }

  withError(error: unknown) {
    const fields = error instanceof Error ? serializeError(error) : { error }

    return this.withFields(fields)
  }

  withFields(fields: Record<string, unknown>) {
    return new StructuredLogger(this.message, {
      ...this.fields,
      ...fields,
    })
  }
}

export const logger = new StructuredLogger()
