import './globals.css'

export const metadata = {
  title: 'Netlify - Next.js E2E Tests',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
