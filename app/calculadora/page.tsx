"use client"

import { useState } from "react"
import { AppShell } from "@/components/app-shell"
import { FinancialCalculator } from "@/components/financial-calculator"
import { FinancialCalculatorCaixa } from "@/components/financial-calculator-caixa"
import { usePageTracking } from "@/lib/auth-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Calculator, Sparkles } from "lucide-react"
import { GlowCard, IconGlow } from "@/components/ui/design-system"

export default function CalculadoraPage() {
  usePageTracking("calculadora")
  const [activeTab, setActiveTab] = useState("caixa")

  return (
    <AppShell title="Calculadora">
      <div className="container px-3 sm:px-4 py-4 sm:py-6 max-w-5xl mx-auto">
        {/* Header with icon */}
        <div className="mb-6 sm:mb-8 text-center animate-fadeInDown">
          <IconGlow color="purple" size="lg" className="mb-3 sm:mb-4">
            <Calculator className="h-8 sm:h-10 w-8 sm:w-10 text-white" />
          </IconGlow>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Calculadora Financeira
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4">
            Simule financiamentos com cálculos oficiais da Caixa Econômica ou compare diferentes cenários
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl">
              <TabsTrigger 
                value="caixa" 
                className="gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
              >
                <Building2 className="h-4 w-4" />
                Caixa Econômica
              </TabsTrigger>
              <TabsTrigger 
                value="avancada" 
                className="gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
              >
                <Calculator className="h-4 w-4" />
                Avançada
              </TabsTrigger>
            </TabsList>

            <TabsContent value="caixa" className="space-y-4 animate-fadeInUp">
              <GlowCard glowColor="blue" className="mb-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">
                      ✅ Cálculo Oficial da Caixa
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Inclui todos os seguros obrigatórios (MIP e DFI), tarifas administrativas e CET.
                      Resultado 99%+ idêntico ao simulador oficial da CEF.
                    </p>
                  </div>
                </div>
              </GlowCard>
              <FinancialCalculatorCaixa />
            </TabsContent>

            <TabsContent value="avancada" className="space-y-4 animate-fadeInUp">
              <GlowCard glowColor="purple" className="mb-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">
                      📊 Calculadora Avançada
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Compare sistemas Price e SAC, analise valor presente e capacidade de financiamento.
                      Ideal para análises comparativas e estudos de cenários.
                    </p>
                  </div>
                </div>
              </GlowCard>
              <FinancialCalculator />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  )
}
