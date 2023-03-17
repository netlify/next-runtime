import { previewData } from 'next/headers'

export default function Page() {
  const data = previewData()

  const hasData = !!data && data.key === 'value'

  return (
    <>
      <h1>hello from /hooks/use-preview-data</h1>
      {hasData ? (
        <h2 id="has-preview-data">Has preview data</h2>
      ) : (
        <h2 id="does-not-have-preview-data">Does not have preview data</h2>
      )}
    </>
  )
}
