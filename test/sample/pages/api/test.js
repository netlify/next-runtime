export default (req, res) => {
  // Enable Preview Mode by setting the cookies
  res.setPreviewData({})
  res.end('preview mode enabled')
}
