import destr from 'destr'
import { existsSync } from 'fs-extra'
import { join } from 'pathe'

/**
 * If this flag is enabled, we generate individual Lambda functions for API Routes.
 * They're packed together in 50mb chunks to avoid hitting the Lambda size limit.
 *
 * To prevent bundling times from rising,
 * we use the "none" bundling strategy where we fully rely on Next.js' `.nft.json` files.
 * This should to a significant speedup, but is still experimental.
 *
 * If disabled, we bundle all API Routes into a single function.
 * This is can lead to large bundle sizes.
 *
 * Relies on `next-server.js.nft.json`, which is only supported in Next.js 12+.
 *
 * Disabled by default. Can be overriden using the NEXT_SPLIT_API_ROUTES env var.
 */
export const splitApiRoutes = (featureFlags: Record<string, unknown>, publish: string) => {
  const isEnabled = destr(process.env.NEXT_SPLIT_API_ROUTES) ?? featureFlags.next_split_api_routes ?? false

  if (isEnabled && !existsSync(join(publish, 'next-server.js.nft.json'))) {
    console.warn(
      'Trace-based bundling not possible on this version of Next.js. Speed up your builds significantly by upgrading to Next.js v12 or newer.',
    )
    return false
  }

  return isEnabled
}

export const bundleBasedOnNftFiles = (featureFlags: Record<string, unknown>) => {
  const isEnabled =
    destr(process.env.NEXT_BUNDLE_BASED_ON_NFT_FILES) ?? featureFlags.next_bundle_based_on_nft_files ?? false

  return isEnabled
}
