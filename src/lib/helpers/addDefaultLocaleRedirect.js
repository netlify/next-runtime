const getI18n = require('./getI18n')
// In i18n projects, we need to create redirects from the "naked" route
// to the defaultLocale-prepended route i.e. /static -> /en/static
// Note: there can only one defaultLocale, but we put it in an array to simplify
// logic in redirects.js files via concatenation
const addDefaultLocaleRedirect = async (redirects, route, target, additionalParams) => {
  const i18n = await getI18n()
  const { defaultLocale } = i18n

  // If no i18n, skip
  if (!defaultLocale) return

  const routePieces = route.split('/')
  const [, routeLocale] = routePieces
  if (routeLocale === defaultLocale) {
    const nakedRoute = route === `/${routeLocale}` ? '/' : route.replace(`/${routeLocale}`, '')
    redirects.push({
      route: nakedRoute,
      target: target || route,
      ...additionalParams,
    })
  }
}

module.exports = addDefaultLocaleRedirect
