import Image from 'next/image.js'

export default function Hero({ passed, failed, passRate }) {
  const total = passed + failed
  return (
    <>
      <div className="testResults">
        <div className="logo">
          <Image alt="netlify logo" src="/logo-light.svg" width={150} height={70} />
        </div>
        <h1>
          Next.js Runtime v5
          <br />
          Report
        </h1>
        <div className="resultData">
          <h3>
            <span>{passRate}</span>
            <br /> Pass rate
          </h3>
          <h3>
            <span>{passed.toLocaleString()}</span> of <span>{total.toLocaleString()}</span>
            <br /> Next.js tests passing
          </h3>
          <h3>
            <span>{failed}</span>
            <br /> Tests to go
          </h3>
        </div>
      </div>
    </>
  )
}
