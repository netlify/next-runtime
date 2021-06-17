const waitOn = require('wait-on')

// Clears the active deployment and shuts down servers
const clearDeployment = async (_params, config) => {

  const { activeDeployment } = config
  if (activeDeployment && activeDeployment.server) {
    process.stdout.write('Shutting down server...')
    activeDeployment.server.kill()
    await waitOn({ resources: ['http://localhost:9999/'], timeout: 5000, reverse: true, verbose: true })

    console.log('..Done! ✅')
  }

  // Clear active deployment
  config.activeDeployment = null

  return true
}

module.exports = clearDeployment
