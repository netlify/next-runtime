// Clears the active deployment and shuts down servers
const clearDeployment = (_params, config) => {
  // Shut down server. Must use -PID for some reason.
  // See: https://medium.com/@almenon214/killing-processes-with-node-772ffdd19aad
  const { activeDeployment } = config
  if (activeDeployment && activeDeployment.serverPID) {
    process.stdout.write('Shutting down server...')
    process.kill(-activeDeployment.serverPID)
    console.log(' Done! ✅')
  }

  // Clear active deployment
  config.activeDeployment = null

  return true
}

module.exports = clearDeployment
