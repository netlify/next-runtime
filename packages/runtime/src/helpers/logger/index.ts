// Pino only supports JSON output but this uses a pretty formatter
// It will still give timestamps and log levels though
// export { logger as default } from './pino'

// Winston supports JSON by default but this is using a custom formatter
// It only gives the message and not the timestamp or log level
export { logger as default } from './winston'
