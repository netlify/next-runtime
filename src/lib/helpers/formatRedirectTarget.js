// Returns formatted redirect target
const { DYNAMIC_PARAMETER_REGEX } = require('../constants/regex')

const formatRedirectTarget = ({ basePath, target }) =>
  basePath && basePath !== '' && target.includes(basePath)
    ? target.replace(DYNAMIC_PARAMETER_REGEX, '/:$1').replace('[', '').replace(']', '').replace('...', '')
    : target

module.exports = formatRedirectTarget
