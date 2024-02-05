import { getDeployStore } from '@netlify/blobs'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.query?.value) {
    const store = getDeployStore()
    await store.setJSON('test-key', req.query.value)
    res.status(200).json({ message: `Value ${JSON.stringify(req.query.value)} set for key 'test-key'` })
  } else {
    res.status(400).json({ message: 'No value provided via "value" query string' })
  }
}
