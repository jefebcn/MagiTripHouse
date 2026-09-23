import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'Magic Trip House',
  description: 'Premium quality · consegna discreta a casa o in locker in tutta Europa',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Magic Trip House',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    apple: '/IMG_2768.jpeg',
    icon: '/IMG_2768.jpeg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head />
      <body>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  )
}
