const Page = ({ message, showAd }) => (
  <div>
    <p id="message">{message}</p>
    {showAd ? (
      <div>
        <p>This is an ad that isn't shown by default</p>
        <img src="http://placekitten.com/400/300" />
      </div>
    ) : (
      <p>No ads for me</p>
    )}
  </div>
)

export async function getStaticProps(context) {
  return {
    props: {
      message: 'This is a static page',
      showAd: false,
    },
  }
}

export default Page
