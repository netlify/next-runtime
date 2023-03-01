export default async function handler(req, res) {
  try {
    await res.revalidate('/getStaticProps/with-revalidate/')
    console.log('Revalidated', req.url)
    return res.json({ revalidated: true })
  } catch (err) {
    return res.status(500).send('Error revalidating')
  }
}
