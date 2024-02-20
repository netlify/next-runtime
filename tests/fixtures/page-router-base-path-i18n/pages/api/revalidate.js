export default async function handler(req, res) {
  try {
    const pathToRevalidate = req.query.path
    if (!pathToRevalidate) {
      return res.status(400).send({
        status: 'error',
        error: 'missing "path" query parameter',
      })
    }
    await res.revalidate(pathToRevalidate)
    return res.status(200).json({ message: 'ok' })
  } catch (err) {
    return res.status(500).send({
      status: 'error',
      error: error.toString(),
    })
  }
}
