import type { Metadata } from 'next'
import { Karla, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { APP_NAME, APP_DESCRIPTION } from '@/lib/app-config'

const karla = Karla({
  subsets: ['latin'],
  variable: '--font-karla',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  icons: {
    icon: '/images/brooklinen-icon.png',
    apple: '/images/brooklinen-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${karla.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var dark=t==='dark'||(!t&&d);document.documentElement.classList.toggle('dark',dark);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-[var(--surface)] text-[var(--text)]" suppressHydrationWarning>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
