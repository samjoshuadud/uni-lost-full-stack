import './globals.css'
import { Toaster } from "@/components/ui/toaster"
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: 'UniLostAndFound',
  description: 'University Lost and Found System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
