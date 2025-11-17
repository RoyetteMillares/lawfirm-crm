import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"  // ← Use sonner, not toast

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Legal Fusion",
  description: "Intelligent Case Intake Platform",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
