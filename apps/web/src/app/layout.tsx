import React from 'react';
import type { Metadata } from 'next'
import { TRPCProvider } from '@/lib/trpc/provider'

export const metadata: Metadata = {
  title: 'Momentum',
  description: 'Goal-oriented coaching platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>
          {children}
        </TRPCProvider>
      </body>
    </html>
  )
} 