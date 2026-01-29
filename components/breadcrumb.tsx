import Link from "next/link"
import { Home, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type BreadcrumbItem = {
  label: string
  href?: string
}

type BreadcrumbProps = {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      className={cn("flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm mb-4 sm:mb-6", className)}
      aria-label="Breadcrumb"
    >
      <Link
        href="/"
        className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
      >
        <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline">Início</span>
      </Link>

      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5 sm:gap-2">
          <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-400 dark:text-gray-600" />
          {item.href && i < items.length - 1 ? (
            <Link
              href={item.href}
              className="text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate max-w-[120px] sm:max-w-[200px]"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px] sm:max-w-[200px]">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}
