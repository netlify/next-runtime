import type { Context } from '@netlify/edge-functions'

interface I18NConfig {
  defaultLocale: string
  localeDetection?: false
  locales: string[]
}

export interface RequestData {
  geo?: {
    city?: string
    country?: string
    region?: string
    latitude?: string
    longitude?: string
    timezone?: string
  }
  headers: Record<string, string>
  ip?: string
  method: string
  nextConfig?: {
    basePath?: string
    i18n?: I18NConfig | null
    trailingSlash?: boolean
  }
  page?: {
    name?: string
    params?: { [key: string]: string }
  }
  url: string
  body?: ReadableStream<Uint8Array>
}

export const buildNextRequest = (
  request: Request,
  context: Context,
  nextConfig?: RequestData['nextConfig'],
): RequestData => {
  const { url, method, body, headers } = request
  const { country, subdivision, city, latitude, longitude, timezone } = context.geo
  const geo: RequestData['geo'] = {
    country: country?.code,
    region: subdivision?.code,
    city,
    latitude: latitude?.toString(),
    longitude: longitude?.toString(),
    timezone,
  }

  return {
    headers: Object.fromEntries(headers.entries()),
    geo,
    url,
    method,
    ip: context.ip,
    body: body ?? undefined,
    nextConfig,
  }
}
