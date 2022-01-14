import '../styles/globals.css'

function MyApp({ Component, pageProps }) {
  return (
    <div className='prose ml-14 mt-10 mb-20'>
      <Component {...pageProps} />
    </div>
  )
}

export default MyApp
