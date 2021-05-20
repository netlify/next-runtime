const runJobsQueue = require('../helpers/runJobsQueue')
const apiSetup = require('../pages/api/setup')
const getInitialPropsSetup = require('../pages/getInitialProps/setup')
const getServerSidePropsSetup = require('../pages/getServerSideProps/setup')
const getStaticPropsSetup = require('../pages/getStaticProps/setup')
const getSPFallbackSetup = require('../pages/getStaticPropsWithFallback/setup')
const getSPRevalidateSetup = require('../pages/getStaticPropsWithRevalidate/setup')
const withoutPropsSetup = require('../pages/withoutProps/setup')

// Set up all our NextJS pages according to the recipes defined in pages/
const setupPages = async ({ functionsPath, publishPath }) => {
  const jobs = [
    ...(await apiSetup(functionsPath)),
    ...(await getInitialPropsSetup(functionsPath)),
    ...(await getServerSidePropsSetup(functionsPath)),
    ...(await getStaticPropsSetup({ functionsPath, publishPath })),
    ...(await getSPFallbackSetup(functionsPath)),
    ...(await getSPRevalidateSetup(functionsPath)),
    ...(await withoutPropsSetup(publishPath)),
  ]

  return runJobsQueue(jobs)
}

module.exports = setupPages
