export default function handler(req, res) {
  res.status(200).json({ name: 'geo-test', headers: req.headers })
}
