const Product = ({ time, slug }) => (
  <div>
    <h1>Product {slug}</h1>
    <p>
      This page uses getStaticProps() and getStaticPaths() to pre-fetch a Product
      <span data-testid="date-now">{time}</span>
    </p>
  </div>
)

export async function getStaticProps({ params }) {
  return {
    props: {
      time: new Date().toISOString(),
      slug: params.slug,
    },
  }
}

export const getStaticPaths = () => {
  return {
    paths: [
      {
        params: {
          slug: 'prerendered',
        },
        locale: 'en',
      },
      {
        params: {
          slug: 'prerendered',
        },
        locale: 'de',
      },
    ],
    fallback: 'blocking', // false or "blocking"
  }
}

export default Product
