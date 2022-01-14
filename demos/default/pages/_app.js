import '../styles/globals.css'

function MyApp({ Component, pageProps }) {
  return (
    <div className='prose'>
      <Component {...pageProps} />
    </div>
  )
}

export default MyApp
