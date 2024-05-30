import './globals.scss'

export const metadata = {
  title: 'Next E2E Tests Report',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div>
          <section>{children}</section>
        </div>
      </body>
    </html>
  )
}
