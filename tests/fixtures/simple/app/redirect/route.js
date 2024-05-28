import { redirect } from 'next/navigation'

export async function GET() {
  return redirect('https://www.netlify.com/')
}

export const dynamic = 'force-dynamic'
