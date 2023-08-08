export default async function preview(req, res) {
  // Enable Preview Mode by setting the cookies
  res.setPreviewData({})

  res.status(200).json({ name: 'preview mode' })
}
