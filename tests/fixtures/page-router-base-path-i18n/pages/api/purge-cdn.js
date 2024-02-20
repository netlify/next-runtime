import { purgeCache } from '@netlify/functions'

/**
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
export default async function handler(req, res) {
  try {
    const pathToPurge = req.query.path
    if (!pathToPurge) {
      return res.status(400).send({
        status: 'error',
        error: 'missing "path" query parameter',
      })
    }
    await purgeCache({ tags: [`_N_T_${pathToPurge}`] })
    return res.status(200).json({ message: 'ok' })
  } catch (err) {
    return res.status(500).send({
      status: 'error',
      error: error.toString(),
    })
  }
}
