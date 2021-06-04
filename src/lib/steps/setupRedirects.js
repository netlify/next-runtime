const { join } = require('path')

const { existsSync, readFileSync, writeFileSync } = require('fs-extra')

const getNextConfig = require('../../../helpers/getNextConfig')
const { CUSTOM_REDIRECTS_PATH, NEXT_IMAGE_FUNCTION_NAME } = require('../config')
const convertToBasePathRedirects = require('../helpers/convertToBasePathRedirects')
const formatRedirectTarget = require('../helpers/formatRedirectTarget')
const getNetlifyRoutes = require('../helpers/getNetlifyRoutes')
const getSortedRedirects = require('../helpers/getSortedRedirects')
const isDynamicRoute = require('../helpers/isDynamicRoute')
const isRootCatchAllRedirect = require('../helpers/isRootCatchAllRedirect')
const { logTitle, logItem } = require('../helpers/logger')
const removeFileExtension = require('../helpers/removeFileExtension')

// Setup _redirects file that routes all requests to the appropriate location,
// such as one of the Netlify functions or one of the static files.
const setupRedirects = async (publishPath) => {
  logTitle('🔀 Setting up redirects')

  // Collect custom redirects defined by the user
  const redirects = []
  if (existsSync(CUSTOM_REDIRECTS_PATH)) {
    logItem('# Prepending custom redirects')
    redirects.push(readFileSync(CUSTOM_REDIRECTS_PATH, 'utf8'))
  }

  // Collect redirects for NextJS pages
  const getApiRedirects = require('../pages/api/redirects')
  const getInitialPropsRedirects = require('../pages/getInitialProps/redirects')
  const getServerSidePropsRedirects = require('../pages/getServerSideProps/redirects')
  const getStaticPropsRedirects = require('../pages/getStaticProps/redirects')
  const getSPFallbackRedirects = require('../pages/getStaticPropsWithFallback/redirects')
  const getSPRevalidateRedirects = require('../pages/getStaticPropsWithRevalidate/redirects')
  const getWithoutPropsRedirects = require('../pages/withoutProps/redirects')

  let nextRedirects = [
    ...(await getApiRedirects()),
    ...(await getInitialPropsRedirects()),
    ...(await getServerSidePropsRedirects()),
    ...(await getStaticPropsRedirects()),
    ...(await getSPFallbackRedirects()),
    ...(await getSPRevalidateRedirects()),
    ...(await getWithoutPropsRedirects()),
  ]

  // Add _redirect section heading
  redirects.push('# Next-on-Netlify Redirects')

  const { basePath } = await getNextConfig()
  if (basePath && basePath !== '') {
    nextRedirects = convertToBasePathRedirects({ basePath, nextRedirects })
  }

  const staticRedirects = nextRedirects.filter(({ route }) => !isDynamicRoute(removeFileExtension(route)))
  const dynamicRedirects = nextRedirects.filter(({ route }) => isDynamicRoute(removeFileExtension(route)))

  // Add necessary next/image redirects for our image function
  dynamicRedirects.push({
    route: `${basePath || ''}/_next/image*  url=:url w=:width q=:quality`,
    target: `/nextimg/:url/:width/:quality`,
    statusCode: '301',
    force: true,
  })
  dynamicRedirects.push({
    route: '/nextimg/*',
    target: `/.netlify/functions/${NEXT_IMAGE_FUNCTION_NAME}`,
  })

  const sortedStaticRedirects = getSortedRedirects(staticRedirects)
  const sortedDynamicRedirects = getSortedRedirects(dynamicRedirects)

  // Assemble redirects for each route
  ;[...sortedStaticRedirects, ...sortedDynamicRedirects].forEach((nextRedirect) => {
    // One route may map to multiple Netlify routes: e.g., catch-all pages
    // require two Netlify routes in the _redirects file
    getNetlifyRoutes(nextRedirect.route).forEach((netlifyRoute) => {
      const { conditions = [], force = false, statusCode = '200', target } = nextRedirect
      const redirectPieces = [
        netlifyRoute,
        formatRedirectTarget({ basePath, target }),
        `${statusCode}${force ? '!' : ''}`,
        conditions.join('  '),
      ]
      const redirect = redirectPieces.join('  ').trim()
      logItem(redirect)
      redirects.push(redirect)
    })
  })

  // This takes care of this issue: https://github.com/netlify/next-on-netlify/issues/43
  // where the page chunk for a root level catch-all is served incorrectly to the client.
  // NOTE: Netlify is also investigating this issue internally.
  const hasRootCatchAll = redirects.some(isRootCatchAllRedirect)
  if (hasRootCatchAll) {
    const rootCatchAllIndex = redirects.findIndex(isRootCatchAllRedirect)
    // Add general "no-op" redirect before the root catch-all redirect
    redirects.splice(rootCatchAllIndex, 0, '/_next/*  /_next/:splat  200')
  }

  // Write redirects to _redirects file
  writeFileSync(join(publishPath, '_redirects'), redirects.join('\n'))
}

module.exports = setupRedirects
