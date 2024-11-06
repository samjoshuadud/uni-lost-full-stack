import './globals.css'
import { Toaster } from "@/components/ui/toaster"

export const metadata = {
  title: 'UniLostAndFound',
  description: 'University Lost and Found System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
