import { purgeCache } from '@netlify/functions'

/**
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
export default async function handler(req, res) {
  const pathToPurge = req.query.path
  if (!pathToPurge) {
    return res.status(400).send({
      status: 'error',
      error: 'missing "path" query parameter',
    })
  }

  try {
    await purgeCache({ tags: [`_N_T_${pathToPurge}`] })
    return res.status(200).json({ message: 'ok' })
  } catch (err) {
    return res.status(500).send({
      status: 'error',
      error: error.toString(),
    })
  }
}
