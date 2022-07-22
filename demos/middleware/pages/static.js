const Page = ({ message }) => <div>{message}</div>

export async function getStaticProps(context) {
  return {
    props: {
      message: 'This is a static page',
    },
  }
}

export default Page
