import './globals.css'
import { Fraunces, Space_Grotesk } from 'next/font/google'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap'
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap'
})

export const metadata = {
  title: 'WildDuck Admin',
  description: 'Modern administration console for WildDuck'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${fraunces.variable}`}>
      <body style={{ fontFamily: 'var(--font-sans)' }}>{children}</body>
    </html>
  )
}
