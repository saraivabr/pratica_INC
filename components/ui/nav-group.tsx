"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface NavGroupProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}

export function NavGroup({ title, children, defaultOpen = false, badge }: NavGroupProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider",
          "text-muted-foreground/70 hover:text-muted-foreground transition-colors",
          "hover:bg-muted/50 rounded-md"
        )}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          {title}
          {badge && badge > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-1 pl-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
