/**
 * By default, we bundle all API Routes into a single function.
 * This is fast, but can lead to large bundle sizes.
 *
 * If this flag is enabled, we generate one function per API Route.
 * We'll also use the "none" bundling strategy where we fully rely on Next.js' `.nft.json` files.
 * This should lead to smaller bundle sizes at the same speed, but is still experimental.
 */
export const SPLIT_API_ROUTES = Boolean(process.env.NEXT_SPLIT_API_ROUTES)
