const Context = ({ context }) => <pre>{JSON.stringify(context, 2, ' ')}</pre>

export const getServerSideProps = async (context) => {
  return {
    props: {
      context,
    },
  }
}

export default Context
