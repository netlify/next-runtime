const CATCH_ALL_REGEX = /\/\[\.{3}(.*)](.json)?$/
const OPTIONAL_CATCH_ALL_REGEX = /\/\[{2}\.{3}(.*)]{2}(.json)?$/
const DYNAMIC_PARAMETER_REGEX = /\/\[(.*?)]/g

module.exports = {
  CATCH_ALL_REGEX,
  OPTIONAL_CATCH_ALL_REGEX,
  DYNAMIC_PARAMETER_REGEX,
}
