import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CasperEye - CSPR Staking Intelligence',
  description: 'Real-time risk analysis for Bitcoin staking networks',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white">{children}</body>
    </html>
  )
}