const apiSetup = require('../pages/api/setup')
const getInitialPropsSetup = require('../pages/getInitialProps/setup')
const getServerSidePropsSetup = require('../pages/getServerSideProps/setup')
const getStaticPropsSetup = require('../pages/getStaticProps/setup')
const getSPFallbackSetup = require('../pages/getStaticPropsWithFallback/setup')
const getSPRevalidateSetup = require('../pages/getStaticPropsWithRevalidate/setup')
const withoutPropsSetup = require('../pages/withoutProps/setup')

// Set up all our NextJS pages according to the recipes defined in pages/
const setupPages = async ({ functionsPath, publishPath }) => {
  await apiSetup({ functionsPath, publishPath })
  await getInitialPropsSetup({ functionsPath, publishPath })
  await getServerSidePropsSetup({ functionsPath, publishPath })
  await getStaticPropsSetup({ functionsPath, publishPath })
  await getSPFallbackSetup({ functionsPath, publishPath })
  await getSPRevalidateSetup({ functionsPath, publishPath })
  await withoutPropsSetup({ publishPath })
}

module.exports = setupPages
