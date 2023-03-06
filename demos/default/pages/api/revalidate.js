export default async function handler(req, res) {
  try {
    const path = '/getStaticProps/with-revalidate/'
    await res.revalidate(path)
    console.log('Revalidated:', path)
    return res.json({ code: 200, message: 'success' })
  } catch (err) {
    return res.status(500).send({ code: 200, message: err.message })
  }
}
