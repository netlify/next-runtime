export const onEnd = ({ utils }) => {
  utils.status.show({
    title: 'Please upgrade to the latest version of the Netlify CLI',
    summary: 'To support for the latest Next.js features, please upgrade to the latest version of the Netlify CLI',
  })
}
