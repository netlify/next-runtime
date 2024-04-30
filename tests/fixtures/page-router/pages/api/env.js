/**
 * @param {import('next').NextApiRequest} _req
 * @param {import('next').NextApiResponse} res
 */
export default async function handler(_req, res) {
  res.status(200).json({
    '.env': process.env.FROM_DOT_ENV ?? 'undefined',
    '.env.local': process.env.FROM_DOT_ENV_DOT_LOCAL ?? 'undefined',
    '.env.production': process.env.FROM_DOT_ENV_DOT_PRODUCTION ?? 'undefined',
    '.env.production.local': process.env.FROM_DOT_ENV_DOT_PRODUCTION_DOT_LOCAL ?? 'undefined',
  })
}
