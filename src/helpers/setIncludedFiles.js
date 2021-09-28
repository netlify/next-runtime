const { HANDLER_FUNCTION_NAME, ODB_FUNCTION_NAME } = require('../constants')

const setIncludedFiles = ({ netlifyConfig, distDir }) => {
  // Serverless functions need parts of build dist in runtime env
  ;[HANDLER_FUNCTION_NAME, ODB_FUNCTION_NAME].forEach((functionName) => {
    if (!netlifyConfig.functions[functionName]) {
      netlifyConfig.functions[functionName] = {}
    }
    if (!netlifyConfig.functions[functionName].included_files) {
      netlifyConfig.functions[functionName].included_files = []
    }
    netlifyConfig.functions[functionName].included_files.push(
      `${distDir}/server/**`,
      `${distDir}/serverless/**`,
      `${distDir}/*.json`,
      `${distDir}/BUILD_ID`,
    )
  })
}

module.exports = setIncludedFiles
