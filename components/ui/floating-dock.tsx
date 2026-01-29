"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface DockItem {
  href: string
  icon: LucideIcon
  label: string
}

interface FloatingDockProps {
  items: DockItem[]
  className?: string
}

export function FloatingDock({ items, className }: FloatingDockProps) {
  const pathname = usePathname()
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null)

  return (
    <div className={cn("fixed bottom-4 left-1/2 -translate-x-1/2 z-40", className)}>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="relative flex items-center gap-1 px-2 py-2 rounded-2xl bg-background/80 backdrop-blur-xl border border-border/50 shadow-lg shadow-black/10"
      >
        {/* Active indicator glow */}
        {items.map((item, index) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          if (!isActive) return null
          return (
            <motion.div
              key={`glow-${item.href}`}
              layoutId="dock-glow"
              className="absolute inset-y-2 w-12 bg-primary/20 rounded-xl blur-md -z-10"
              style={{ left: `${8 + index * 52}px` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )
        })}

        {items.map((item, index) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <div key={item.href} className="relative">
              {/* Tooltip */}
              <AnimatePresence>
                {hoveredIndex === index && (
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-foreground text-background text-xs font-medium whitespace-nowrap z-50"
                  >
                    {item.label}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>

              <Link
                href={item.href}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="block"
              >
                <motion.div
                  whileHover={{ scale: 1.15, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "relative flex items-center justify-center w-12 h-12 rounded-xl transition-colors duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Icon className="h-5 w-5" />

                  {/* Active dot indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="dock-dot"
                      className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary-foreground"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.div>
              </Link>
            </div>
          )
        })}
      </motion.div>
    </div>
  )
}
