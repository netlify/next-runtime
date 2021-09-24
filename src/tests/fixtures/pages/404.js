import React from 'react';

export default function Page404() {
  return (
    <h1>404!</h1>
  )
}

export const getStaticProps = async () => {
  return {
    props: {},
  }
}
