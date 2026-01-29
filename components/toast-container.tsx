"use client"

import { useToastStore } from "@/lib/toast-store"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function ToastContainer() {
  const toasts = useToastStore(s => s.toasts)
  const removeToast = useToastStore(s => s.removeToast)

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm w-full px-4 sm:px-0">
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-4 border-l-4",
              toast.type === 'success' && "border-green-500",
              toast.type === 'error' && "border-red-500",
              toast.type === 'warning' && "border-orange-500",
              toast.type === 'info' && "border-blue-500"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                {toast.type === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                {toast.type === 'warning' && <AlertTriangle className="h-5 w-5 text-orange-500" />}
                {toast.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    {toast.description}
                  </p>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                aria-label="Fechar notificação"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
