const Page = ({ message, showAd }) => (
  <div>
    <p>{message}</p>
    {showAd ? <div>This is an ad that isn't shown by default</div> : <p>No ads for me</p>}
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
