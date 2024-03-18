export default async (req, res) => {
  await fetch(`https://webhook.site/${req.body.token}`)

  res.setHeader('Content-Type', 'application/json')
  res.status(200)
  res.json({ message: 'hello world :)' })
}

export const config = {
  type: 'experimental-background',
}
