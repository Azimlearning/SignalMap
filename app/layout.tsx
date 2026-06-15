import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Link from "next/link"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "SignalMap — Malaysia Talent Demand Intelligence",
  description:
    "See what Malaysia is hiring for. Know where you fit. Real-time AI-powered talent demand signals for graduates and employers.",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-brand-bg">
        <header className="bg-brand-primary text-white shadow-md">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
              <span className="text-white/90">◈</span>
              <span>SignalMap</span>
              <span className="text-white/50 font-normal text-sm hidden sm:inline">
                Malaysia Talent Intelligence
              </span>
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link
                href="/dashboard"
                className="text-white/80 hover:text-white transition-colors font-medium"
              >
                Dashboard
              </Link>
              <span className="text-white/30">|</span>
              <span className="text-white/50 text-xs">Team Dang Wangi</span>
            </div>
          </nav>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-gray-400">
            SignalMap · Talentbank Tech Hackathon 2026 · Team Dang Wangi
          </div>
        </footer>
      </body>
    </html>
  )
}
