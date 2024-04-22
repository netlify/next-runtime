const Show = ({ show, time }) => (
  <div>
    <p>
      This page uses getStaticProps() to pre-fetch a TV show at
      <span data-testid="date-now">{time}</span>
    </p>
    <hr />
    <h1>Show #{show.id}</h1>
    <p>{show.name}</p>
  </div>
)

export async function getStaticProps(context) {
  const start = Date.now()

  const res = await fetch(`https://tvproxy.netlify.app/shows/71`)
  const data = await res.json()

  const fetchDuration = Date.now() - start
  if (fetchDuration < 5000) {
    // simulate slow (~5s) response
    await new Promise((resolve) => setTimeout(resolve, 5000 - fetchDuration))
  }

  return {
    props: {
      show: data,
      time: new Date().toISOString(),
    },
    revalidate: +process.env.REVALIDATE_SECONDS || 10, // In seconds
  }
}

export default Show
