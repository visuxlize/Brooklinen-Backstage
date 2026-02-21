import type { Metadata } from 'next'
import { Karla, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme/ThemeProvider'

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
  title: 'Brooklinen Scheduling Platform',
  description: 'Scheduling and retail operations for Brooklinen stores',
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
