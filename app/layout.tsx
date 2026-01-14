import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Daily Wish - Mint Your Wish Onchain',
  description: 'One wish a day, one NFT on Arc Testnet, forever in your wallet. Build your daily ritual and onchain streak.',
  generator: 'Daily Wish',
  icons: {
    icon: '/arc-logo.png',
    apple: '/arc-logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        {/* Analytics component removed */}
      </body>
    </html>
  )
}
