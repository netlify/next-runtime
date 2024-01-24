export default async function handler(req, res) {
  try {
    await res.revalidate('/static/revalidate-manual')
    return res.json({ code: 200, message: 'success' })
  } catch (err) {
    return res.status(500).send({ code: 500, message: err.message })
  }
}
