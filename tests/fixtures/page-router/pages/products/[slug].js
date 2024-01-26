const Product = ({ time }) => (
  <div>
    <p>
      This page uses getStaticProps() and getStaticPaths() to pre-fetch a Product
      <span data-testid="date-now">{time}</span>
    </p>
  </div>
)

export async function getStaticProps() {
  return {
    props: {
      time: new Date().toISOString(),
    },
  }
}

export const getStaticPaths = () => {
  return {
    paths: [
      {
        params: {
          slug: 'an-incredibly-long-product-name-thats-impressively-repetetively-needlessly-overdimensioned-and-should-be-shortened-to-less-than-255-characters-for-the-sake-of-seo-and-ux-and-first-and-foremost-for-gods-sake-but-nobody-wont-ever-read-this-anyway',
        },
      },
    ],
    fallback: false, // false or "blocking"
  }
}

export default Product
