const { join } = require('path')
const { readJsonSync } = require('fs-extra')

// Set baseurl, either localhost:9999 or based on deployed Netlify URL
const getBaseUrl = ({ project }, config) => {
  // Local deployment
  if (config.env.DEPLOY === 'local') {
    return 'http://localhost:9999/'
  }
  // Deployment on Netlify
  else if (config.env.DEPLOY == 'netlify') {
    const { deploy_url } = readJsonSync(join(config.buildsFolder, project, 'deployment.json'))
    return deploy_url
  }
}

module.exports = getBaseUrl
