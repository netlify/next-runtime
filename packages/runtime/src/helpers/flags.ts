import destr from 'destr'

/**
 * If this flag is enabled, we generate one function per API Route.
 * We'll also use the "none" bundling strategy where we fully rely on Next.js' `.nft.json` files.
 * This should lead to smaller bundle sizes at the same speed, but is still experimental.
 *
 * If disabled, we bundle all API Routes into a single function.
 * This is fast, but can lead to large bundle sizes.
 *
 * Enabled by default. Can be disabled by passing NEXT_SPLIT_API_ROUTES=false.
 */
export const SPLIT_API_ROUTES = destr(process.env.NEXT_SPLIT_API_ROUTES ?? 'true')
