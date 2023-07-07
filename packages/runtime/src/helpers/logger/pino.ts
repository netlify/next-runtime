import pino from 'pino'
// Should only be used in development but buildbot expects STDOUT
import pretty from 'pino-pretty'

export const logger = pino(pretty())
