import { use } from 'react'
import fs from 'fs'
import path from 'path'

async function getData({ params }) {
  const data = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), 'app/dashboard/deployments/[id]/data.json')
    )
  )
  console.log('data.json', data)

  return {
    id: params.id,
  }
}

export default function DeploymentsPage(props) {
  const data = use(getData(props))

  return (
    <>
      <p>hello from app/dashboard/deployments/[id]. ID is: {data.id}</p>
    </>
  )
}
