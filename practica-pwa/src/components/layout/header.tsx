"use client"

import { ChevronLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface HeaderProps {
  title?: string
  showBack?: boolean
  rightAction?: React.ReactNode
  className?: string
}

export function Header({
  title,
  showBack = false,
  rightAction,
  className,
}: HeaderProps) {
  const router = useRouter()

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100",
        "pt-safe",
        className
      )}
    >
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="w-10">
          {showBack && (
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>
          )}
        </div>

        {title && (
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {title}
          </h1>
        )}

        <div className="w-10 flex justify-end">{rightAction}</div>
      </div>
    </header>
  )
}
