import type React from "react"
import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from "@/components/providers"

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] }) // add weights as needed

export const metadata: Metadata = {
  title: "Escrow",
  description: "Escrow [payment]",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {


  return (
    <html lang="en">
      <body className={poppins.className}>
        <ThemeProvider attribute="class" defaultTheme="dark">
         <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
