export default async function handler(req, res) {
  try {
    // res.revalidate returns a promise that can be awaited to wait for the revalidation to complete
    // if user doesn't await it, we still want to ensure the revalidation is completed, so we internally track
    // this as "background work" to ensure it completes before function suspends execution
    res.revalidate('/static/revalidate-manual')
    return res.json({ code: 200, message: 'success' })
  } catch (err) {
    return res.status(500).send({ code: 500, message: err.message })
  }
}
