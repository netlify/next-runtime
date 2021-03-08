const { join } = require('path')
const { readJsonSync } = require('fs-extra')

const NEXT_PATH = join(__dirname, '..', '..', '..', 'node_modules', 'next')
const { version: NEXT_VERSION } = readJsonSync(join(NEXT_PATH, 'package.json'))

module.exports = { NEXT_VERSION }
