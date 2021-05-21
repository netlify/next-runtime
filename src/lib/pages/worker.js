const setupNetlifyFunctionForPage = require('../helpers/setupNetlifyFunctionForPage')
const setupStaticFileForPage = require('../helpers/setupStaticFileForPage')

exports.processPage = function processPage(job) {
  try {
    switch (job.type) {
      case 'function': {
        return setupNetlifyFunctionForPage(job)
      }
      case 'static': {
        return setupStaticFileForPage(job)
      }
      default:
        console.log('Unknown job type', job.type)
    }
  } catch (error) {
    console.error('Error in worker', error, 'Job', job)
  }
}
