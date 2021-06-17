const { removeSync } = require('fs-extra')
const waitOn = require('wait-on')
const execa = require('execa')
const { join } = require('path')
const getBaseUrl = require('./getBaseUrl')

// Deploy the project locally, using netlify dev
const deployLocally = ({ project }, config) => {
  console.log(`Deploying project: ${project}...`)

  const server = execa('npm', ['run', 'serve'], {
    cwd: join(config.buildsFolder, project),
  })
  server.stdout.pipe(process.stdout)
  server.stderr.pipe(process.stderr)
  console.log("Started preview")
  // Set deployment
  config.activeDeployment = {
    server
  }

  // wait for server to start
  return new Promise((resolve) => {
    const url = getBaseUrl({ project }, config)
    console.log(`Waiting for ${url}`)
    waitOn({ resources: [url], timeout: 10000, verbose: true }).then(() => {
      console.log(' Done! ✅')
      resolve(true)
    })
  })
}

// Deploy the project on Netlify
const deployOnNetlify = ({ project }, config) => {
  console.log(`Deploying project: ${project}...`)

  // Trigger deploy
  const deploy = execa.sync('npm', ['run','deploy'], {
    cwd: join(config.buildsFolder, project),
    localDir: true,
  })

  // Verify success
  const url = getBaseUrl({ project }, config)
  if (!url) throw 'Deployment failed'

  config.activeDeployment = {
    server: null,
  }

  console.log(' Done! ✅')
  console.log(`URL: ${url}`)
  return true
}

const deployProject = ({ project }, config) => {
  console.log(`Deploying with profile ${config.env.DEPLOY}`)
  // Local deployment
  if (config.env.DEPLOY === 'local') {
    return deployLocally({ project }, config)
  }
  // Deployment on Netlify
  else if (config.env.DEPLOY == 'netlify') {
    return deployOnNetlify({ project }, config)
  }
}

module.exports = deployProject
