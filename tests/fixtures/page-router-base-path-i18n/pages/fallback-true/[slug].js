import { useRouter } from 'next/router'

const Product = ({ time, slug }) => {
  const router = useRouter()

  if (router.isFallback) {
    return <span data-testid="loading">Loading...</span>
  }

  return (
    <div>
      <h1>Product {slug}</h1>
      <p>
        This page uses getStaticProps() and getStaticPaths() to pre-fetch a Product
        <span data-testid="date-now">{time}</span>
      </p>
    </div>
  )
}

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
      },
    ],
    fallback: true,
  }
}

export default Product
