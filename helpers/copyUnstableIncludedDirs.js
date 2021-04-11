const path = require('path')
const fs = require('fs')
const AdmZip = require('adm-zip')
const getNetlifyFunctionName = require('../src/lib/helpers/getNetlifyFunctionName')

// This is UNSTABLE support for special use cases needing files served with their Next.js
// pages that become Netlify functions. Eventually this will be supported internally.
const copyUnstableIncludedDirs = ({ nextConfig, functionsDist }) => {
  for (const name in nextConfig.unstableNetlifyFunctionsSupport || {}) {
    const includeDirs = nextConfig.unstableNetlifyFunctionsSupport[name].includeDirs || []
    console.log('Processing included dirs for ', name)

    const zipName = path.join(functionsDist, getNetlifyFunctionName(name) + '.zip')
    const zip = new AdmZip(zipName)
    includeDirs.forEach((includes) => {
      if (fs.lstatSync(includes).isDirectory()) {
        // We add the files at the root of the ZIP because process.cwd()
        // points to `/` in serverless functions
        zip.addLocalFolder(includes, includes)
        console.log(`Added ${includes} to ${zipName}`)
      }
    })
    zip.writeZip(zipName)
  }
}

module.exports = copyUnstableIncludedDirs
