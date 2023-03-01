export default async function handler(req, res) {
  try {
    const path = '/getStaticProps/with-revalidate/'
    await res.revalidate(path)
    console.log('Revalidated:', path)
    return res.json({ revalidated: true })
  } catch (err) {
    return res.status(500).send('Error revalidating:', err)
  }
}
