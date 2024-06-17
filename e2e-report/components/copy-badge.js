'use client'
import { CopyIcon } from './icons'

const host = 'https://runtime-e2e-report.netlify.app' // fixed
const badgeLink = `<a href="${host}/" target="_blank"><img src="${host}/badge" width="200" height="30" alt="Netlify Next.js runtime v5 test status" /></a>`

export default function CopyBadgeButton() {
  return (
    <button
      className="btn btn-xs btn-outline text-white rounded px-0.5"
      onClick={() => {
        navigator.clipboard.writeText(badgeLink)
      }}
    >
      <CopyIcon className="size-4" />
    </button>
  )
}
