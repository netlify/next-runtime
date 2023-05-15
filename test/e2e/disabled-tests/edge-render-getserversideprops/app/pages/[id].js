export const config = {
  runtime: 'edge',
}

export default function Page(props) {
  return (
    <>
      <p id="page">/[id]</p>
      <p id="props">{JSON.stringify(props)}</p>
    </>
  )
}

export function getServerSideProps({ req, params, query }) {
  return {
    props: {
      url: req.url,
      query,
      params,
      now: Date.now(),
    },
  }
}
