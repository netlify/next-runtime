const i18n = require('./getI18n')()
const getDataRouteForRoute = require('./getDataRouteForRoute')

const addLocaleRedirects = (redirects) => (route, target) => {
  i18n.locales.forEach((locale) => {
    redirects.push({
      route: `/${locale}${route === '/' ? '' : route}`,
      target,
    })
    redirects.push({
      route: getDataRouteForRoute(route, locale),
      target,
    })
  })
}

module.exports = addLocaleRedirects
