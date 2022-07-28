import { Match, match } from 'https://deno.land/x/path_to_regexp@v6.2.1/index.ts'

import {
  compileNonPath,
  DynamicRoute,
  Header,
  matchHas as nextMatchHas,
  prepareDestination,
  Redirect,
  Rewrite,
  RouteHas,
  RoutesManifest,
  searchParamsToUrlQuery,
} from './next-utils.ts'

type Params = Record<string, string>
export type Rule = Rewrite | Header | Redirect

/**
 * Converts Next.js's internal parsed URL response to a `URL` object.
 */

function preparedDestinationToUrl({ newUrl, parsedDestination }: ReturnType<typeof prepareDestination>): URL {
  const transformedUrl = new URL(newUrl, 'http://n')
  transformedUrl.hostname = parsedDestination.hostname ?? ''
  transformedUrl.port = parsedDestination.port ?? ''
  transformedUrl.protocol = parsedDestination.protocol ?? ''
  for (const [name, value] of Object.entries(parsedDestination.query)) {
    transformedUrl.searchParams.set(name, String(value))
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
  return nextMatchHas(
    request,
    // y u no narrow `has` type?
    has,
    searchParamsToUrlQuery(url.searchParams),
  )
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

export function applyRewriteRule({ request, rule }: { request: Request; rule: Rewrite }): Request | false {
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
    destination.hostname = new URL(request.url).hostname
  }

  return new Request(destination.href, request)
}

/**
 * Applies a redirect rule to a request. If it matches, returns a redirect response, otherwise `false`.
 */

export function applyRedirectRule({ request, rule }: { request: Request; rule: Redirect }): Response | false {
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
    destination.hostname = new URL(request.url).hostname
  }

  return Response.redirect(destination.href, rule.statusCode)
}

/**
 * Applies a header rule to a request. If it matches, returns a new request with the headers, otherwise `false`.
 */

export function applyHeaderRule({ request, rule }: { request: Request; rule: Header }): Request | false {
  const params = matchesRule({ request, rule })
  if (!params) {
    return false
  }
  const hasParams = Object.keys(params).length > 0
  const headers = new Headers(request.headers)
  for (const { key, value } of rule.headers) {
    if (hasParams) {
      headers.set(compileNonPath(key, params), compileNonPath(value, params))
    } else {
      headers.set(key, value)
    }
  }
  return new Request(request.url, {
    ...request,
    headers,
  })
}

export function applyHeaders(request: Request, rules: Header[]): Request {
  // Apply all headers rules in order
  return rules.reduce((request, rule) => {
    return applyHeaderRule({ request, rule }) || request
  }, request)
}

export function applyRedirects(request: Request, rules: Redirect[]): Response | false {
  // Redirects only apply the first matching rule
  for (const rule of rules) {
    const match = applyRedirectRule({ request, rule })
    if (match) {
      return match
    }
  }
  return false
}

export function applyRewrites({
  request,
  rules,
  staticRoutes,
  checkStaticRoutes = false,
}: {
  request: Request
  rules: Rewrite[]
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
 * Run the rules that run before middleware
 */
export function runPreMiddleware(request: Request, manifest: RoutesManifest): Request | Response {
  const output: Request = applyHeaders(request, manifest.headers)
  const redirect = applyRedirects(output, manifest.redirects)
  if (redirect) {
    return Response.redirect(redirect.url, redirect.status)
  }
  return output
}

/**
 * Run the rules that run after middleware
 */
export function runPostMiddleware(
  request: Request,
  manifest: RoutesManifest,
  staticRoutes: Set<string>,
  skipBeforeFiles = false,
): Request | Response {
  // Everyone gets the beforeFiles rewrites, unless we're re-running after matching fallback
  let result = skipBeforeFiles
    ? request
    : applyRewrites({
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
  const afterRewrite = applyRewrites({
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

  // Now we check dynamic routes, so we can
  const dynamicRoute = matchDynamicRoute(result, manifest.dynamicRoutes)
  if (dynamicRoute) {
    result.headers.set('x-matched-path', dynamicRoute)
    return result
  }

  // Finally, check for fallback rewrites
  const fallbackRewrite = applyRewrites({
    request: result,
    rules: manifest.rewrites.fallback,
  })

  // If the fallback matched, we go right back to checking for static routes
  if (fallbackRewrite) {
    return runPostMiddleware(fallbackRewrite, manifest, staticRoutes, true)
  }
  // 404
  return result
}
