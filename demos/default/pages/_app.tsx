import '../styles/globals.css'

function MyApp({ Component, pageProps }) {
  const getLayout = Component.getLayout || ((page) => page)
  console.log('IN APP')
  return (
    <div className='prose ml-14 mt-10 mb-20'>
      {getLayout(<Component {...pageProps} />)}
    </div>
  )
}

export default MyApp
