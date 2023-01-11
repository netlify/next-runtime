import type { EdgeFunction } from 'https://edge.netlify.com'

interface PrerenderedRoute {
  initialRevalidateSeconds: number | false
  srcRoute: string | null
  dataRoute: string | null
}

export const getRscDataRouter = (prerenderedRoutes: Record<string, PrerenderedRoute>): EdgeFunction => {
  const routeEntries: Array<[string, PrerenderedRoute]> = Object.entries(prerenderedRoutes)
  const routes = new Map(routeEntries)

  const rscDataRoutes = new Set(
    routeEntries.map(([, { dataRoute }]) => dataRoute).filter((dataRoute) => dataRoute?.endsWith('.rsc')),
  )

  return (request, context) => {
    const debug = request.headers.has('x-next-debug-logging')
    const log = (...args: unknown[]) => {
      if (debug) {
        console.log(...args)
      }
    }
    const url = new URL(request.url)
    // Manifest always has the route without a trailing slash
    const pathname = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname
    // If this is a static RSC request, rewrite to the data route
    if (request.headers.get('rsc') === '1') {
      log('Is rsc request')
      const route = routes.get(pathname)
      if (route?.dataRoute) {
        request.headers.set('x-rsc-route', url.pathname)
        return context.rewrite(new URL(route.dataRoute, request.url))
      }
    } else if (rscDataRoutes.has(pathname)) {
      log('Is rsc data request. Adding rsc header')
      request.headers.set('rsc', '1')
    }
  }
}
