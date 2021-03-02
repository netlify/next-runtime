// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)
// You can read more here:
// https://on.cypress.io/plugins-guide

const { join } = require('path')

const clearProject = require('./clearProject')
const copyFixture = require('./copyFixture')
const buildProject = require('./buildProject')
const deployProject = require('./deployProject')
const getBaseUrl = require('./getBaseUrl')
const clearDeployment = require('./clearDeployment')

const tasks = [clearProject, copyFixture, buildProject, deployProject, getBaseUrl, clearDeployment]

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = (on, config) => {
  // We will use this to track deployment state
  config.activeDeployment = null

  // Add path to builds folder
  config.buildsFolder = join(__dirname, '..', 'builds')

  // Set up tasks
  const tasksObject = {}
  tasks.forEach((task) => {
    // Make config availabe in tasks
    tasksObject[task.name] = (...args) => task(...args, config)
  })
  on('task', tasksObject)

  // Other tasks that don't warrant a separate function
  on('task', {
    // Check if deployment is currently active
    isDeployed: () => {
      if (config.env.SKIP_DEPLOY === true) return true

      return config.activeDeployment !== null
    },
  })
}
