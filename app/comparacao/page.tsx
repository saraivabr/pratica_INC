"use client"

import { useComparisonStore } from "@/lib/comparison-store"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb } from "@/components/breadcrumb"
import { usePageTracking } from "@/lib/auth-context"
import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { X, MapPin, Building, Calendar, Home, Check, ArrowRight, ImageIcon } from "lucide-react"
import { formatCurrency } from "@/lib/data"
import { cn } from "@/lib/utils"

export default function ComparacaoPage() {
  const { properties, removeProperty, clearAll } = useComparisonStore()

  usePageTracking("comparacao")

  if (properties.length === 0) {
    return (
      <AppShell title="Comparação de Imóveis">
        <div className="container mx-auto px-3 sm:px-4 py-6 max-w-7xl">
          <Breadcrumb items={[
            { label: 'Imóveis', href: '/empreendimentos' },
            { label: 'Comparação' }
          ]} />

          <div className="text-center py-16 animate-fadeInUp">
            <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Home className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Nenhum imóvel para comparar</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Adicione até 4 imóveis para comparar suas características
            </p>
            <Button asChild>
              <Link href="/empreendimentos">
                Ver imóveis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Comparação de Imóveis">
      <div className="container mx-auto px-3 sm:px-4 py-6 max-w-7xl">
        <Breadcrumb items={[
          { label: 'Imóveis', href: '/empreendimentos' },
          { label: 'Comparação' }
        ]} />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Comparação de Imóveis</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {properties.length} {properties.length === 1 ? 'imóvel selecionado' : 'imóveis selecionados'}
            </p>
          </div>
          <Button variant="outline" onClick={clearAll}>
            Limpar tudo
          </Button>
        </div>

        <div className={cn(
          "grid gap-6",
          properties.length === 1 && "grid-cols-1 max-w-2xl",
          properties.length === 2 && "grid-cols-1 md:grid-cols-2",
          properties.length === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
          properties.length === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
        )}>
          {properties.map((property) => {
            const disponiveisCount = (property.unidades || []).filter(u => u.status === "disponivel").length
            const hasImage = Boolean(property.imagemPrincipal)
            const firstUnit = property.unidades?.[0]

            return (
              <Card key={property.id} className="relative overflow-hidden">
                <button
                  onClick={() => removeProperty(property.id)}
                  className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center shadow-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors group"
                  aria-label="Remover da comparação"
                >
                  <X className="h-4 w-4 text-gray-600 group-hover:text-red-600" />
                </button>

                <div className="relative aspect-[4/3] overflow-hidden">
                  {hasImage ? (
                    <Image
                      src={property.imagemPrincipal as string}
                      alt={property.nome}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                      <ImageIcon className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                </div>

                <CardContent className="p-4 sm:p-5">
                  <h3 className="font-bold text-lg mb-4 line-clamp-2">{property.nome}</h3>

                  <div className="space-y-3">
                    {/* Preço */}
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Preço</span>
                      <span className="font-bold text-emerald-600">
                        {property.precoMinimo ? formatCurrency(property.precoMinimo) : "Consulte"}
                      </span>
                    </div>

                    {/* Quartos */}
                    {firstUnit?.quartos && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Quartos</span>
                        <span className="font-medium">{firstUnit.quartos}</span>
                      </div>
                    )}

                    {/* Área */}
                    {firstUnit?.metragem && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Área</span>
                        <span className="font-medium">{firstUnit.metragem}m²</span>
                      </div>
                    )}

                    {/* Localização */}
                    {(property.bairro || property.cidade) && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Localização</span>
                        <span className="font-medium text-right text-sm">
                          {[property.bairro, property.cidade].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}

                    {/* Construtora */}
                    {property.construtora && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Construtora</span>
                        <span className="font-medium text-sm">{property.construtora}</span>
                      </div>
                    )}

                    {/* Entrega */}
                    {property.previsaoEntrega && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Entrega</span>
                        <span className="font-medium text-sm">{property.previsaoEntrega}</span>
                      </div>
                    )}

                    {/* Unidades disponíveis */}
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Disponíveis</span>
                      <Badge variant={disponiveisCount > 0 ? "default" : "secondary"}>
                        {disponiveisCount} unidades
                      </Badge>
                    </div>
                  </div>

                  <Button asChild className="w-full mt-4">
                    <Link href={`/empreendimentos/${property.id}`}>
                      Ver detalhes
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Adicionar mais imóveis */}
        {properties.length < 4 && (
          <div className="mt-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Você pode adicionar até {4 - properties.length} {4 - properties.length === 1 ? 'imóvel' : 'imóveis'} a mais
            </p>
            <Button asChild variant="outline">
              <Link href="/empreendimentos">
                Adicionar mais imóveis
              </Link>
            </Button>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease-out forwards;
        }
      `}</style>
    </AppShell>
  )
}
