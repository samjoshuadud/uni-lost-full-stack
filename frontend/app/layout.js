import './globals.css'

export const metadata = {
  title: 'UniLostAndFound',
  description: 'University Lost and Found System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
