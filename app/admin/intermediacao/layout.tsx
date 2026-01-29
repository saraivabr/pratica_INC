"use client"

import { IntermediacaoNav } from "@/components/intermediacao/IntermediacaoNav"
import { IntermediacaoSidebar } from "@/components/intermediacao/IntermediacaoSidebar"

export default function IntermediacaoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header do modulo */}
      <div className="border-b px-4 sm:px-6 py-4">
        <h1 className="text-xl sm:text-2xl font-bold">Intermediacao Imobiliaria</h1>
        <p className="text-sm text-muted-foreground">
          Gestao de comissoes e pagamentos
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar para desktop */}
        <IntermediacaoSidebar className="hidden lg:flex" />

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Navegacao por tabs para mobile/tablet */}
          <nav className="border-b px-4 sm:px-6 lg:hidden overflow-x-auto">
            <IntermediacaoNav />
          </nav>

          {/* Conteudo */}
          <main className="flex-1 p-4 sm:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
