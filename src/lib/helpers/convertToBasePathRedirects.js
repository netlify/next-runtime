// This helper converts the collection of redirects for all page types into
// the necessary redirects for a basePath-generated site
// NOTE: /withoutProps/redirects.js has some of its own contained basePath logic

const getBasePathDefaultRedirects = ({ basePath, nextRedirects }) => {
  if (!basePath) return []
  // In a basePath-configured site, all _next assets are fetched with the prepended basePath
  return [
    {
      route: `${basePath}/_next/*`,
      target: '/_next/:splat',
      statusCode: '301',
      force: true,
    },
  ]
}

const convertToBasePathRedirects = ({ basePath, nextRedirects }) => {
  if (!basePath) return nextRedirects
  const basePathRedirects = getBasePathDefaultRedirects({ basePath, nextRedirects })
  nextRedirects.forEach((r) => {
    if (r.route === '/') {
      // On Vercel, a basePath configured site 404s on /, but we can ensure it redirects to /basePath
      const indexRedirects = [
        {
          route: '/',
          target: basePath,
          statusCode: '301',
          force: true,
        },
        {
          route: basePath,
          target: r.target,
        },
      ]
      basePathRedirects.push(...indexRedirects)
    } else if (r.specialPreviewMode) {
      basePathRedirects.push({
        route: `${basePath}${r.route}`,
        target: r.target,
        force: true,
        conditions: r.conditions,
      })
    } else if (!r.route.includes('_next/') && r.target.includes('/.netlify/functions') && r.conditions) {
      // If this is a preview mode redirect, we need different behavior than other function targets below
      // because the conditions prevent us from doing a route -> basePath/route force
      basePathRedirects.push({
        route: `${basePath}${r.route}`,
        target: r.target,
        force: true,
        conditions: r.conditions,
      })
      basePathRedirects.push({
        route: `${basePath}${r.route}`,
        target: r.route,
      })
    } else if (!r.route.includes('_next/') && r.target.includes('/.netlify/functions')) {
      // This force redirect is necessary for non-preview mode function targets because the serverless lambdas
      // try to strip basePath and redirect to the plain route per https://github.com/vercel/next.js/blob/5bff9eac084b69affe3560c4f4cfd96724aa5e49/packages/next/next-server/lib/router/router.ts#L974
      const functionRedirects = [
        {
          route: r.route,
          target: `${basePath}${r.route}`,
          statusCode: '301',
          force: true,
        },
        {
          route: `${basePath}${r.route}`,
          target: r.target,
        },
      ]
      basePathRedirects.push(...functionRedirects)
    } else {
      basePathRedirects.push(r)
    }
  })
  return basePathRedirects
}

module.exports = convertToBasePathRedirects
