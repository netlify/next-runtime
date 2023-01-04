export default async (req, res) => {
  // Respond with JSON
  res.setHeader('Content-Type', 'application/json')

  // Get the ID of the show
  const { query } = req
  const { id } = query

  // Get the data
  const fetchRes = await fetch(`https://tvproxy.netlify.app/shows/${Number(id)}`)
  const data = await fetchRes.json()

  // If show was found, return it
  if (fetchRes.status == 200) {
    res.status(200)
    res.json({ show: data })
  }
  // If show was not found, return error
  else {
    res.status(404)
    res.json({ error: 'Show not found' })
  }
}
