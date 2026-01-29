"use client"

import { useComparisonStore } from "@/lib/comparison-store"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { X, ArrowRight } from "lucide-react"
import Image from "next/image"

export function ComparisonFloatingBar() {
  const router = useRouter()
  const { properties, removeProperty } = useComparisonStore()

  if (properties.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 md:bottom-6 left-0 right-0 z-40 px-4"
      >
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-2xl shadow-2xl shadow-emerald-500/50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 flex items-center gap-3 overflow-x-auto">
                <span className="text-sm font-medium whitespace-nowrap">
                  {properties.length} {properties.length === 1 ? 'imóvel' : 'imóveis'} para comparar:
                </span>

                <div className="flex items-center gap-2">
                  {properties.map(property => (
                    <div
                      key={property.id}
                      className="relative group flex-shrink-0"
                    >
                      <div className="h-12 w-12 rounded-lg overflow-hidden bg-white/20 backdrop-blur-sm">
                        {property.imagemPrincipal ? (
                          <Image
                            src={property.imagemPrincipal}
                            alt={property.nome}
                            width={48}
                            height={48}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full bg-white/30" />
                        )}
                      </div>
                      <button
                        onClick={() => removeProperty(property.id)}
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remover"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => router.push('/comparacao')}
                className="bg-white text-emerald-600 hover:bg-emerald-50 font-semibold whitespace-nowrap"
              >
                Comparar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
