import { Redirect as NextRedirect, Header } from 'next/dist/lib/load-custom-routes'

export interface DynamicRoute {
  page: string
  regex: string
  routeKeys: Record<string, string>
  namedRegex: string
}

export interface StaticRoute {
  page: string
  regex: string
  routeKeys: Record<string, string>
  namedRegex: string
}

export interface DataRoute {
  page: string
  dataRouteRegex: string
  routeKeys: Record<string, string>
  namedDataRouteRegex: string
}

export interface I18n {
  defaultLocale: string
  locales: string[]
}

export interface Redirect extends NextRedirect {
  regex: string
  internal?: boolean
}

export type Rewrites =
  | {
      fallback?: Array<Redirect>
      afterFiles?: Array<Redirect>
      beforeFiles?: Array<Redirect>
    }
  | Array<Redirect>

export interface RoutesManifest {
  version: number
  pages404: boolean
  basePath: string
  redirects: Redirect[]
  headers: Header[]
  dynamicRoutes: DynamicRoute[]
  staticRoutes?: StaticRoute[]
  dataRoutes: DataRoute[]
  i18n: I18n
  rewrites: Rewrites
}
