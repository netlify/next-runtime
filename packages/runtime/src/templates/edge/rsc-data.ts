import prerenderManifest from '../edge-shared/prerender-manifest.json' assert { type: 'json' }
import nextConfig from '../edge-shared/nextConfig.json' assert { type: 'json' }
import { getRscDataRouter } from '../edge-shared/rsc-data.ts'

const handler = getRscDataRouter(prerenderManifest.routes, nextConfig.trailingSlash)
export default handler
