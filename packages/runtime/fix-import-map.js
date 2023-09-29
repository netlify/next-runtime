const fs = require('fs')
const path = require('path')

const importMapPath = path.join('.', 'src', 'templates', 'vendor', 'import_map.json')

// eslint-disable-next-line n/no-sync
const contents = JSON.parse(fs.readFileSync(importMapPath))

const scopedImportMap = {
  // this empty object is required, so that edge-bundler doesn't fail :/
  imports: {},
  scopes: {
    'file:///root/.netlify/edge-functions/': contents.imports,
  },
}

// eslint-disable-next-line n/no-sync
fs.writeFileSync(importMapPath, JSON.stringify(scopedImportMap, null, 2))
