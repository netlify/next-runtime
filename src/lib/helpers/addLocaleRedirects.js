const asyncForEach = require('./asyncForEach')
const getDataRouteForRoute = require('./getDataRouteForRoute')
const getI18n = require('./getI18n')

const addLocaleRedirects = async (redirects, route, target) => {
  const i18n = await getI18n()
  await asyncForEach(i18n.locales, async (locale) => {
    redirects.push({
      route: `/${locale}${route === '/' ? '' : route}`,
      target,
    })
    redirects.push({
      route: await getDataRouteForRoute(route, locale),
      target,
    })
  })
}

module.exports = addLocaleRedirects
