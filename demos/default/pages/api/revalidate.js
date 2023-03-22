export default async function handler(req, res) {
  const query = req.query
  const select = Number(query.select) || 0

  // these paths are used for e2e testing res.revalidate()
  const paths = [
    '/getStaticProps/with-revalidate/', // valid path
    '/fr/getStaticProps/with-revalidate/', // valid path (with locale)
    '/', // valid path (index)
    '/fr/', // valid path (index with locale)
    '/getStaticProps/withRevalidate/2/', // valid path (with dynamic route)
    '/getStaticProps/withRevalidate/3/', // invalid path (fallback false with dynamic route)
    '/getStaticProps/withRevalidate/withFallbackBlocking/3/', // valid path (fallback blocking with dynamic route)
    '/fr/getStaticProps/withRevalidate/withFallbackBlocking/3/', // valid path (fallback blocking with dynamic route and locale)
    '/blog/nick/', // valid path (with prerendered appDir dynamic route)
    '/blog/greg/', // invalid path (with non-prerendered appDir dynamic route)
    '/blog/rob/hello/', // valid path (with appDir dynamic route catch-all)
  ]

  try {
    await res.revalidate(paths[select])
    return res.json({ code: 200, message: 'success' })
  } catch (err) {
    return res.status(500).send({ code: 500, message: err.message })
  }
}
