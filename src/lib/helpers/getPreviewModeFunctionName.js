// Some pages (getStaticProps/withFallback) require a separate standard function for preview mode; this provides the name for that function, to be called in several places

const getPreviewModeFunctionName = (functionName) => `preview-${functionName}`

module.exports = getPreviewModeFunctionName
