// Clear the build cache

const { join } = require('path')
const { emptyDirSync } = require('fs-extra')

const CACHE_PATH = join(__dirname, '..', 'builds')

emptyDirSync(CACHE_PATH)
console.log('Cleared', CACHE_PATH, '✔')
