function Dynamic() {
  return <div>This is the page with a dynamic path.</div>
}

export const getStaticPaths = async () => {
  return { paths: ['/dynamic/dynamic-1'], fallback: false }
}

export const getStaticProps = ({ params }) => {
  return { props: params }
}

export default Dynamic
