const Product = ({ params }) => (
  <div>
    <h1>Product {decodeURI(params.slug)}</h1>
    <p>
      This page uses generateStaticParams() to prerender a Product
      <span data-testid="date-now">{new Date().toISOString()}</span>
    </p>
  </div>
)

export async function generateStaticParams() {
  return [
    {
      // Japanese prerendered (non-ascii)
      slug: '事前レンダリング',
    },
  ]
}

export default Product
