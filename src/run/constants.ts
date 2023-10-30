import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MODULE_DIR = fileURLToPath(new URL('.', import.meta.url))
export const PLUGIN_DIR = resolve(`${MODULE_DIR}../..`)
export const WORKING_DIR = process.cwd()

export const RUN_DIR = WORKING_DIR
