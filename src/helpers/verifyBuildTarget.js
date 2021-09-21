const { yellowBright } = require('chalk')

const verifyBuildTarget = (target) => {
  if (target !== 'server') {
    // NOTE: This will only work for Next > 11.1.2
    console.log(yellowBright`Forcing site to build with target: server`)
    process.env.NEXT_PRIVATE_TARGET = 'server'
  }
}

module.exports = verifyBuildTarget
