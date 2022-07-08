/**
 * @param {import('http').IncomingMessage} req
 */
export default async (req, res) => {
  // Respond with JSON
  res.setHeader('Content-Type', 'application/json')

  // Get the ID of the show
  const { query } = req
  const { id } = query

  // Get the data
  const fetchRes = await fetch(`https://api.tvmaze.com/shows/${id}`)
  const data = await fetchRes.json()

  // If show was found, return it
  if (fetchRes.status == 200) {
    res.status(200)
    res.json({
      show: data,
      headers: { ...req.headers },
      url: req.url,
      path: req.path,
      query: req.query,
      status: req.status,
      id: req.id,
    })
  }
  // If show was not found, return error
  else {
    res.status(404)
    res.json({ error: 'Show not found' })
  }
}
