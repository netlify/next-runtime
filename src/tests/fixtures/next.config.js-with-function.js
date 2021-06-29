
module.exports = (phase, { defaultConfig }) => {
  // next-on-netlify uses settings from PHASE_PRODUCTION_BUILD
  // This is the same phase that is used when running `next build`
  if (phase === "phase-production-build") {
    return {
      target: 'serverless',
      distDir: '.myCustomDir',
    }
  }

  // Default options
  return {}
}
