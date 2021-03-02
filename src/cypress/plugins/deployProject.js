const { removeSync } = require('fs-extra')
const waitOn = require('wait-on')
const execa = require('execa')
const { join } = require('path')
const getBaseUrl = require('./getBaseUrl')

// Deploy the project locally, using netlify dev
const deployLocally = ({ project }, config) => {
  process.stdout.write(`Deploying project: ${project}...`)

  // Start server. Must start in detached mode, so that we can kill it later.
  // Otherwise, we seem unable to kill it.
  // See: https://medium.com/@almenon214/killing-processes-with-node-772ffdd19aad
  const server = execa('npm', ['run', 'preview'], {
    cwd: join(config.buildsFolder, project),
    detached: true,
    localDir: true,
  })

  // Set deployment
  config.activeDeployment = {
    serverPID: server.pid,
  }

  // wait for server to start
  return new Promise((resolve) => {
    const url = getBaseUrl({ project }, config)

    waitOn({ resources: [url] }).then(() => {
      console.log(' Done! ✅')
      resolve(true)
    })
  })
}

// Deploy the project on Netlify
const deployOnNetlify = ({ project }, config) => {
  process.stdout.write(`Deploying project: ${project}...`)

  // Trigger deploy
  const deploy = execa.sync('npm', ['run', 'deploy'], {
    cwd: join(config.buildsFolder, project),
    localDir: true,
  })

  // Verify success
  const url = getBaseUrl({ project }, config)
  if (!url) throw 'Deployment failed'

  config.activeDeployment = {
    serverPID: null,
  }

  console.log(' Done! ✅')
  console.log(`URL: ${url}`)
  return true
}

const deployProject = ({ project }, config) => {
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
