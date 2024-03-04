export default function handler(req, res) {
  res.headers = { 'headers-from-function': '1' }
  res.json({ url: req.url, headers: req.headers })
}
