import { Geist_Mono, Inter } from "next/font/google"
import type { Metadata } from "next"
import Link from "next/link"
import { Toaster } from "sonner"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SignOut } from "@/components/signout-button"
import { auth } from "@/auth"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Self-service namespaces",
  description: "Self-provision a Kubernetes namespace",
  icons: {
    icon: "/icon.png",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body>
        <ThemeProvider>
          {session && (
            <header className="flex h-12 items-center gap-2 border-b px-4">
              <Link
                href="/namespaces"
                className="mr-auto text-lg font-semibold"
              >
                Self-service namespaces
              </Link>
              <SignOut />
            </header>
          )}
          {children}
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
