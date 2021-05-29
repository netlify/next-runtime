// This helper converts the collection of redirects for all page types into
// the necessary redirects for a basePath-generated site
// i.e.
// no basePath:
// /ssr /.netlify/functions/next_ssr 200
// with basePath configured:
// /ssr /base/ssr 301!
// /base/ssr /.netlify/functions/next_ssr 200

const getBasePathDefaultRedirects = ({ basePath, nextRedirects }) => {
  if (basePath === '') return []
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
  if (basePath === '') return nextRedirects
  const basePathRedirects = getBasePathDefaultRedirects({ basePath, nextRedirects })
  nextRedirects.forEach((r) => {
    if (r.route === '/') {
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
    } else if (!r.route.includes('_next/') && r.target.includes('/.netlify/functions') && r.conditions) {
      // If preview mode redirect
      basePathRedirects.push({
        route: `${basePath}${r.route}`,
        target: r.target,
        conditions: r.conditions,
      })
    } else if (!r.route.includes('_next/') && r.target.includes('/.netlify/functions')) {
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
