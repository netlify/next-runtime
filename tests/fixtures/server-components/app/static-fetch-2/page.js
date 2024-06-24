async function getData() {
  const res = await fetch(`https://strangerthings-quotes.vercel.app/api/quotes`, {
    next: { tags: ['collection,with-comma'] },
  })
  return res.json()
}

export default async function Page() {
  const data = await getData()

  return (
    <>
      <h1>Hello, Static Fetch 2</h1>
      <dl>
        <dt>Quote</dt>
        <dd>{data[0].quote}</dd>
        <dt>Time</dt>
        <dd data-testid="date-now">{new Date().toISOString()}</dd>
      </dl>
    </>
  )
}
