export const metadata = {
  title: 'Netlify Forms',
  description: 'Test for verifying Netlify Forms',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
