export default (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.status(200)
  res.json({ message: 'hello world :)' })
}
