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
 * Enabled by default. Can be disabled by passing NEXT_SPLIT_API_ROUTES=false.
 */

export const splitApiRoutes = (featureFlags: Record<string, unknown>): boolean => {
  if (process.env.NEXT_SPLIT_API_ROUTES) {
    return process.env.NEXT_SPLIT_API_ROUTES === 'true'
  }
  // default to true during testing, swap to false before merging
  return typeof featureFlags.next_split_api_routes === 'boolean' ? featureFlags.next_split_api_routes : true
}
