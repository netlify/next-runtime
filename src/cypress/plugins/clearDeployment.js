// Clears the active deployment and shuts down servers
const clearDeployment = async (_params, config) => {

  const { activeDeployment } = config
  if (activeDeployment && activeDeployment.server) {
    process.stdout.write('Shutting down server...', activeDeployment.server)
    activeDeployment.server.kill()
    // await activeDeployment.server
    console.log(' Done! ✅')
  }

  // Clear active deployment
  config.activeDeployment = null

  return true
}

module.exports = clearDeployment
