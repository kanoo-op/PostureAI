import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Navigation from '@/components/Navigation'
import { CalibrationProvider } from '@/contexts/CalibrationContext'
import AuthProvider from '@/components/AuthProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PostureAI - 운동 자세 분석',
  description: 'AI 기반 운동 자세 분석 및 교정 서비스',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <AuthProvider>
          <CalibrationProvider>
            <div className="min-h-screen flex flex-col">
              <Header />
              <Navigation />
              <main className="flex-1">{children}</main>
              <footer className="bg-gray-100 dark:bg-slate-800 py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    © 2024 PostureAI. All rights reserved.
                  </p>
                </div>
              </footer>
            </div>
          </CalibrationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
