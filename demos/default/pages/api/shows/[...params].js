export default async (req, res) => {
  // Respond with JSON
  res.setHeader('Content-Type', 'application/json')

  // Get the params and query string parameters
  const { query } = req
  const { params, ...queryStringParams } = query

  // Get the ID of the show
  const id = params[0]

  // Get the data
  const fetchRes = await fetch(`https://tvproxy.netlify.app/shows/${Number(id)}`)
  const data = await fetchRes.json()

  // If show was found, return it
  if (fetchRes.status == 200) {
    res.status(200)
    res.json({ params, queryStringParams, show: data })
  }
  // If show was not found, return error
  else {
    res.status(404)
    res.json({ error: 'Show not found' })
  }
}
