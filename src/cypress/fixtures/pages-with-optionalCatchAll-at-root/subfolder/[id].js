const Static = () => <p>static page in subfolder</p>

export async function getStaticPaths() {
  return {
    paths: [
      {
        params: {
          id: 'static',
        },
      },
      {
        params: {
          id: 'test',
        },
      },
    ],
    fallback: true,
  }
}

export async function getStaticProps() {
  return {
    props: {},
  }
}

export default Static
