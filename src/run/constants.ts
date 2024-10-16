import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MODULE_DIR = fileURLToPath(new URL('.', import.meta.url))
export const PLUGIN_DIR = resolve(`${MODULE_DIR}../../..`)
// a file where we store the required-server-files config object in to access during runtime
export const RUN_CONFIG = 'run-config.json'
