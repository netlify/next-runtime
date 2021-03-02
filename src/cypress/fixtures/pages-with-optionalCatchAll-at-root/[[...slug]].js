const Page = () => <p>root-level optional-catch-all</p>

export async function getServerSideProps() {
  return {
    props: {},
  }
}

export default Page
