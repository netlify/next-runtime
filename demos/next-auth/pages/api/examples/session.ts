// This is an example of how to access a session from an API route
import { getSession } from "next-auth/react"
import type { NextApiRequest, NextApiResponse } from "next"

const accessSessionExample = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getSession({ req })
  res.send(JSON.stringify(session, null, 2))
}

export default accessSessionExample;
