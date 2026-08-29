import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hong Kong Weather | Live Conditions',
  description: 'Real-time Hong Kong weather, location comparisons, and Observatory warnings for planning your day.',
  generator: 'v0.app',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/hk-weather-icon.png', apple: '/hk-weather-icon.png' },
}

export const viewport: Viewport = { colorScheme: 'light dark', themeColor: [{ media: '(prefers-color-scheme: light)', color: '#f7f6f0' }, { media: '(prefers-color-scheme: dark)', color: '#202a38' }] }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="bg-background"><body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
