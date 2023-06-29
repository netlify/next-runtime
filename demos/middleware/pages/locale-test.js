import * as React from 'react'

const Page = ({ pageLocale }) => {
  return <div>Locale: {pageLocale}</div>
}

export async function getServerSideProps({ locale }) {
  return {
    props: {
      pageLocale: locale,
    },
  }
}

export default Page
