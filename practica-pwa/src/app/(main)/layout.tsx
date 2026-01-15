"use client"

import { SessionProvider } from "next-auth/react"
import { BottomNav } from "@/components/layout/bottom-nav"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-50 pb-20">
        {children}
        <BottomNav />
      </div>
    </SessionProvider>
  )
}
