const { PHASE_PRODUCTION_BUILD } = require('next/constants')

module.exports = (phase, { defaultConfig }) => {
  // next-on-netlify uses settings from PHASE_PRODUCTION_BUILD
  // This is the same phase that is used when running `next build`
  if (phase === PHASE_PRODUCTION_BUILD) {
    return {
      target: 'serverless',
      distDir: '.myCustomDir',
    }
  }

  // Default options
  return {}
}
