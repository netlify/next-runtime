export default async function handler(req, res) {
  const query = req.query
  const select = Number(query.select) || 0

  const paths = [
    '/getStaticProps/with-revalidate/', // valid path
    '/getStaticProps/with-revalidate', // missing trailing slash
    'getStaticProps/with-revalidate', // missing leading/trailing slash
    '/en/getStaticProps/with-revalidate/', // valid path (with locale)
    '/fr/getStaticProps/with-revalidate/', // valid path (with locale)
    '/', // valid path (index)
    '/en', // missing trailing slash (index)
    '/fr/', // valid path (index with locale)
    '/nothing-here/', // 404
    '/getStaticProps/withRevalidate/2/', // valid path (with dynamic route)
    '/getStaticProps/withRevalidate/3/', // invalid path (fallback false with dynamic route)
    '/getStaticProps/withRevalidate/withFallbackBlocking/3/', // valid path (fallback blocking with dynamic route)
    '/blog/nick/', // valid path (with appDir dynamic route)
    '/blog/greg/', // invalid path (with appDir dynamic route)
    '/blog/rob/hello/', // valid path (with appDir dynamic route)
  ]

  try {
    await res.revalidate(paths[select])
    return res.json({ code: 200, message: 'success' })
  } catch (err) {
    return res.status(500).send({ code: 500, message: err.message })
  }
}
