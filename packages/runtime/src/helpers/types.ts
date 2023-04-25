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

export type Redirect = NextRedirect & {
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

// I have no idea what eslint is up to here but it gives an error
// eslint-disable-next-line no-shadow
export const enum ApiRouteType {
  SCHEDULED = 'experimental-scheduled',
  BACKGROUND = 'experimental-background',
}
