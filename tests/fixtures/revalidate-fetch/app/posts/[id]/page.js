const revalidateSeconds = 3

export async function generateStaticParams() {
  return [{ id: '1' }, { id: '2' }]
}

async function getData(params) {
  const res = await fetch(`https://api.tvmaze.com/shows/${params.id}`, {
    next: { revalidate: revalidateSeconds },
  })
  return res.json()
}

export default async function Page({ params }) {
  const data = await getData(params)

  return (
    <>
      <h1>Revalidate Fetch</h1>
      <p>Paths /1 and /2 prerendered; other paths rendered on-demand</p>
      <p>Revalidating every {revalidateSeconds} seconds</p>
      <dl>
        <dt>Show</dt>
        <dd>{data.name}</dd>
        <dt>Param</dt>
        <dd>{params.id}</dd>
        <dt>Time</dt>
        <dd data-testid="date-now">{Date.now()}</dd>
      </dl>
    </>
  )
}
