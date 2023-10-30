/**
 * Enable Next.js standalone mode at build time
 */
export const setBuildConfig = () => {
  process.env.NEXT_PRIVATE_STANDALONE = 'true'
}
