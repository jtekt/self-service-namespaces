import { Geist_Mono, Inter } from "next/font/google"
import type { Metadata } from "next"
import Link from "next/link"
import { Toaster } from "sonner"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ModeToggle } from "@/components/toggle-mode"
import { HelpLink } from "@/components/help-link"
import { SignOut } from "@/components/signout-button"
import { auth } from "@/auth"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Self-Service Namespaces",
  description: "Self-provision a Kubernetes namespace",
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
      <body className="flex min-h-screen flex-col">
        <ThemeProvider>
          <header className="flex h-12 items-center gap-2 border-b px-4">
            <Link href="/" className="mr-auto text-base font-semibold">
              Self-Service Namespaces
            </Link>
            <ModeToggle />
            <HelpLink />
            {session && <SignOut />}
          </header>
          <main className="mx-auto w-full max-w-3xl flex-1 p-4">{children}</main>
          <footer className="border-t p-4 text-center text-sm">
            Self-Service Namespaces | JTEKT Corporation
          </footer>
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
