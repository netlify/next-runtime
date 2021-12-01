import { OPTIONAL_CATCH_ALL_REGEX, CATCH_ALL_REGEX, DYNAMIC_PARAMETER_REGEX } from '../constants'

export const netlifyRoutesForNextRoute = (nextRoute: string): Array<string> => {
  const netlifyRoutes = [nextRoute]

  // If the route is an optional catch-all route, we need to add a second
  // Netlify route for the base path (when no parameters are present).
  // The file ending must be present!
  if (OPTIONAL_CATCH_ALL_REGEX.test(nextRoute)) {
    let netlifyRoute = nextRoute.replace(OPTIONAL_CATCH_ALL_REGEX, '$2')

    // create an empty string, but actually needs to be a forward slash
    if (netlifyRoute === '') {
      netlifyRoute = '/'
    }
    // When optional catch-all route is at top-level, the regex on line 19 will
    // create an incorrect route for the data route. For example, it creates
    // /_next/data/%BUILDID%.json, but NextJS looks for
    // /_next/data/%BUILDID%/index.json
    netlifyRoute = netlifyRoute.replace(/(\/_next\/data\/[^/]+).json/, '$1/index.json')

    // Add second route to the front of the array
    netlifyRoutes.unshift(netlifyRoute)
  }

  return netlifyRoutes.map((route) =>
    route
      // Replace catch-all, e.g., [...slug]
      .replace(CATCH_ALL_REGEX, '/:$1/*')
      // Replace optional catch-all, e.g., [[...slug]]
      .replace(OPTIONAL_CATCH_ALL_REGEX, '/*')
      // Replace dynamic parameters, e.g., [id]
      .replace(DYNAMIC_PARAMETER_REGEX, '/:$1'),
  )
}
