import * as React from 'react'

const useHydrated = () => {
  const [hydrated, setHydrated] = React.useState(false)
  React.useEffect(() => {
    setHydrated(true)
  }, [])
  return hydrated
}

const Page = ({ message, showAd }) => {
  const hydrated = useHydrated()
  return (
    <div>
      <p id="message">{message}</p>
      {hydrated && showAd ? (
        <div>
          <p>This is an ad that isn't shown by default on static test 2 page</p>
          <img src="http://placekitten.com/400/300" />
        </div>
      ) : (
        <p>No ads for me</p>
      )}
    </div>
  )
}

export async function getStaticProps() {
  return {
    props: {
      message: 'This is a static page',
      showAd: false,
    },
  }
}

export default Page
