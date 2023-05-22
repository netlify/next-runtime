import destr from 'destr'

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
 * Disabled by default. Can be overriden using the NEXT_SPLIT_API_ROUTES env var.
 */
export const splitApiRoutes = (featureFlags: Record<string, unknown>): boolean =>
  destr(process.env.NEXT_SPLIT_API_ROUTES) ?? featureFlags.next_split_api_routes ?? false

/**
 * TODO: write some docs
 */
export const useNoneBundler = (featureFlags: Record<string, unknown>): boolean =>
  destr(process.env.NEXT_USE_NONE_BUNDLER) ?? featureFlags.next_use_none_bundler ?? false
