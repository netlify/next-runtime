export default (req, res) => {
  // We can set custom headers
  res.setHeader('My-Custom-Header', 'header123')

  res.status(200)
  res.json({ message: 'hello world :)' })
}
