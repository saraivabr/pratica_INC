import { JunctionCalculator } from "@/components/calculadora-juncao/junction-calculator"
import { AppShell } from "@/components/app-shell"

export const metadata = {
  title: "Calculadora de Junção | Pratica IA",
  description: "Análise financeira unificada para junção de unidades",
}

export default function JunctionPage() {
  return (
    <AppShell title="Calculadora de Junção" showBackButton backHref="/calculadora">
      <div className="container mx-auto py-8">
        <JunctionCalculator />
      </div>
    </AppShell>
  )
}
