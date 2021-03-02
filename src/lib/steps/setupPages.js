// Set up all our NextJS pages according to the recipes defined in pages/
const setupPages = ({ functionsPath, publishPath }) => {
  require('../pages/api/setup')(functionsPath)
  require('../pages/getInitialProps/setup')(functionsPath)
  require('../pages/getServerSideProps/setup')(functionsPath)
  require('../pages/getStaticProps/setup')({ functionsPath, publishPath })
  require('../pages/getStaticPropsWithFallback/setup')(functionsPath)
  require('../pages/getStaticPropsWithRevalidate/setup')(functionsPath)
  require('../pages/withoutProps/setup')(publishPath)
}

module.exports = setupPages
