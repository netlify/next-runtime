// Winston supports JSON by default but this is using a custom formatter
// It only gives the message and not the timestamp or log level
export { logger as default } from './winston'
