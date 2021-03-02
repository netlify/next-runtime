const WaitForEmptyEventLoop = () => <p>Successfully rendered page!</p>

export const getServerSideProps = async ({ params, req }) => {
  // Set up long-running process
  const timeout = setTimeout(() => {}, 100000)

  // Set behavior of whether to wait for empty event loop
  const wait = String(params.wait).toLowerCase() === 'true'
  const { context: functionContext } = req.netlifyFunctionParams
  functionContext.callbackWaitsForEmptyEventLoop = wait

  return {
    props: {},
  }
}

export default WaitForEmptyEventLoop
