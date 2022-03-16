// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

export default (req, res) => {
  res.status(200).json({ name: 'John Doe', query: req.query, env: process.env.HELLO_WORLD, cwd: process.cwd() })
}
