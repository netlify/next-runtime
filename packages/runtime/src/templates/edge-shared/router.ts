import { Match, match } from 'https://deno.land/x/path_to_regexp@v6.2.1/index.ts'

import {
  compileNonPath,
  DynamicRoute,
  HeaderRule,
  matchHas as nextMatchHas,
  prepareDestination,
  RedirectRule,
  RewriteRule,
  RouteHas,
  RoutesManifest,
  searchParamsToUrlQuery,
} from './next-utils.ts'

type Params = Record<string, string>
export type Rule = RewriteRule | HeaderRule | RedirectRule
export type NextHeaders = Map<string, string>
/**
 * Converts Next.js's internal parsed URL response to a `URL` object.
 */

function preparedDestinationToUrl({ newUrl, parsedDestination }: ReturnType<typeof prepareDestination>): URL {
  const transformedUrl = new URL(newUrl, 'http://n')
  transformedUrl.hostname = parsedDestination.hostname ?? ''
  transformedUrl.port = parsedDestination.port ?? ''
  transformedUrl.protocol = parsedDestination.protocol ?? ''
  for (const [name, value] of Object.entries(parsedDestination.query)) {
    if (Array.isArray(value)) {
      // Arrays of values need to be appended as multiple values
      for (const v of value) {
        transformedUrl.searchParams.append(name, v)
      }
    } else {
      transformedUrl.searchParams.set(name, value)
    }
  }
  return transformedUrl
}

// regexp is based on https://github.com/sindresorhus/escape-string-regexp
// const reHasRegExp = /[|\\{}()[\]^$+*?.-]/

/**
 * Checks if a patch matches a given path pattern. If it matches, then it returns
 * the matched params. If it does not match, then it returns `false`.
 */
function matchPath(sourcePattern: string, path: string): Match<Params> | false {
  // if (reHasRegExp.test(sourcePattern)) {
  //   const matches = new RegExp(sourcePattern).exec(path)
  //   if (!matches) {
  //     return false
  //   }
  // }
  const matcher = match<Params>(sourcePattern, { decode: decodeURIComponent })
  return matcher(path)
}

/**
 * Given a rule destination, and request params and query, generate a destination URL
 * @returns destination The rewritten URL
 */
export function generateDestinationUrl({
  destination,
  query,
  params,
  appendParamsToQuery = false,
}: {
  query: URLSearchParams
  destination: string
  params: Params
  appendParamsToQuery?: boolean
}): URL {
  const preparedDestination = prepareDestination({
    destination,
    params,
    query: searchParamsToUrlQuery(query),
    appendParamsToQuery,
  })
  return preparedDestinationToUrl(preparedDestination)
}

/**
 * Checks if a request matches a list of `has` rules. If it matches (or there are no rules)
 * then it returns any extracted params or an empty object. If there are rules that do not
 * match then it returns `false`.
 */
function matchHas(request: Request, has?: RouteHas[]): Params | false {
  const url = new URL(request.url)
  // If there are no has rules then we do match, but with no params
  if (!has?.length) {
    return {}
  }
  return nextMatchHas(request, has, searchParamsToUrlQuery(url.searchParams))
}

/**
 * Checks if the request matches the given Rewrite, Redirect or Headers rule.
 * If it matches, returns the extracted params (e.g. path segments, query params).
 */
export function matchesRule({ request, rule }: { request: Request; rule: Rule }): Params | false {
  const params: Params = {}
  const url = new URL(request.url)
  if (!new RegExp(rule.regex).test(url.pathname)) {
    return false
  }
  const hasParams = matchHas(request, rule.has)
  if (!hasParams) {
    return false
  }
  Object.assign(params, hasParams)

  const path = url.pathname
  const result = matchPath(rule.source, path)
  if (!result) {
    return false
  }
  Object.assign(params, result.params)

  return params
}

/**
 * Applies a rewrite rule to a request if it matches. Returns the new request, or `false` if it does not match.
 */

export function applyRewriteRule({ request, rule }: { request: Request; rule: RewriteRule }): Request | false {
  const params = matchesRule({ request, rule })
  if (!params) {
    return false
  }
  const destination = generateDestinationUrl({
    query: new URL(request.url).searchParams,
    destination: rule.destination,
    params,
    appendParamsToQuery: true,
  })

  if (destination.hostname === 'n') {
    destination.host = new URL(request.url).host
  }

  return new Request(destination.href, request)
}

/**
 * Applies a redirect rule to a request. If it matches, returns a redirect response, otherwise `false`.
 */

export function applyRedirectRule({ request, rule }: { request: Request; rule: RedirectRule }): Response | false {
  const params = matchesRule({ request, rule })
  if (!params) {
    return false
  }
  const destination = generateDestinationUrl({
    query: new URL(request.url).searchParams,
    destination: rule.destination,
    params,
  })

  if (destination.hostname === 'n') {
    destination.host = new URL(request.url).host
  }

  return Response.redirect(destination.href, rule.statusCode)
}

/**
 * Applies a header rule to a request. If it matches, returns a new request with the headers, otherwise `false`.
 */

export function applyHeaderRule({
  request,
  rule,
  headers,
}: {
  request: Request
  rule: HeaderRule
  headers: NextHeaders
}): NextHeaders | false {
  const params = matchesRule({ request, rule })
  if (!params) {
    return false
  }
  const hasParams = Object.keys(params).length > 0
  for (const { key, value } of rule.headers) {
    if (hasParams) {
      headers.set(compileNonPath(key, params), compileNonPath(value, params))
    } else {
      headers.set(key, value)
    }
  }
  return headers
}

export function applyHeaderRules(request: Request, rules: HeaderRule[]): Array<[key: string, value: string]> {
  const headers = rules.reduce((headers, rule) => {
    return applyHeaderRule({ request, rule, headers }) || headers
  }, new Map<string, string>())
  return [...headers.entries()]
}

export function applyRedirectRules(request: Request, rules: RedirectRule[]): Response | false {
  // Redirects only apply the first matching rule
  for (const rule of rules) {
    const match = applyRedirectRule({ request, rule })
    if (match) {
      return match
    }
  }
  return false
}

export function applyRewriteRules({
  request,
  rules,
  staticRoutes,
  checkStaticRoutes = false,
}: {
  request: Request
  rules: RewriteRule[]
  checkStaticRoutes?: boolean
  staticRoutes?: Set<string>
}): Request | false {
  let result: Request | false = false

  if (checkStaticRoutes && !staticRoutes) {
    throw new Error('staticRoutes must be provided if checkStaticRoutes is true')
  }

  // Apply all rewrite rules in order
  for (const rule of rules) {
    const rewritten = applyRewriteRule({ request, rule })
    if (rewritten) {
      result = rewritten
      if (!checkStaticRoutes) {
        continue
      }
      const { pathname } = new URL(rewritten.url)
      // If a static route is matched, then we exit early
      if (staticRoutes!.has(pathname) || pathname.startsWith('/_next/static/')) {
        result.headers.set('x-matched-path', pathname)
        return result
      }
    }
  }
  return result
}

export function matchDynamicRoute(request: Request, routes: DynamicRoute[]): string | false {
  const { pathname } = new URL(request.url)
  const match = routes.find((route) => {
    return new RegExp(route.regex).test(pathname)
  })
  if (match) {
    return match.page
  }
  return false
}

/**
 * Run the rules that run after middleware
 */
export function runPostMiddleware(
  request: Request,
  manifest: RoutesManifest,
  staticRoutes: Set<string>,
  skipBeforeFiles = false,
  loopChecker = 10,
): Request | Response {
  // Everyone gets the beforeFiles rewrites, unless we're re-running after matching fallback
  let result = skipBeforeFiles
    ? request
    : applyRewriteRules({
        request,
        rules: manifest.rewrites.beforeFiles,
      }) || request

  // Check if it matches a static route or file
  const { pathname } = new URL(result.url)
  if (staticRoutes.has(pathname) || pathname.startsWith('/_next/static/')) {
    result.headers.set('x-matched-path', pathname)
    return result
  }

  // afterFiles rewrites also check if it matches a static file after every match
  const afterRewrite = applyRewriteRules({
    request: result,
    rules: manifest.rewrites.afterFiles,
    checkStaticRoutes: true,
    staticRoutes,
  })

  if (afterRewrite) {
    result = afterRewrite
    // If we match a rewrite, we check if it matches a static route or file
    // If it does, we return right away
    if (afterRewrite.headers.has('x-matched-path')) {
      return afterRewrite
    }
  }

  // Now we check dynamic routes
  const dynamicRoute = matchDynamicRoute(result, manifest.dynamicRoutes)
  if (dynamicRoute) {
    result.headers.set('x-matched-path', dynamicRoute)
    return result
  }

  // Finally, check for fallback rewrites
  const fallbackRewrite = applyRewriteRules({
    request: result,
    rules: manifest.rewrites.fallback,
  })

  // If the fallback matched, we go right back to checking for static routes
  if (fallbackRewrite) {
    if (loopChecker <= 0) {
      throw new Error('Fallback rewrite loop detected')
    }
    return runPostMiddleware(fallbackRewrite, manifest, staticRoutes, true, loopChecker - 1)
  }
  // 404
  return result
}
