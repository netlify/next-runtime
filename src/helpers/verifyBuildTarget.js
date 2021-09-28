const { yellowBright } = require('chalk')

const verifyBuildTarget = (target) => {
  if (target !== 'server') {
    console.log(
      yellowBright`Setting target to ${target} is no longer required. You should check if target=server works for you.`,
    )
  }
}

module.exports = verifyBuildTarget
