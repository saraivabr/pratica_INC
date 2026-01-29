"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, Table2, FileText, BarChart3 } from "lucide-react";
import { ShareModal } from "./share-modal";
import { cn } from "@/lib/utils";

interface EmpreendimentoData {
  id: string;
  nome: string;
  cidade?: string;
  bairro?: string;
  construtora?: string;
  previsaoEntrega?: string;
  tipo?: string;
  descricao?: string;
  diferenciais?: string[];
  imagemPrincipal?: string;
  precoMinimo?: number;
  precoMaximo?: number;
}

interface UnidadeData {
  id: string;
  tipo: string;
  metragem: number;
  valor: number;
  status: string;
  quartos: number;
  vagas: number;
  andar?: number;
  final?: string;
}

interface QuickShareActionsProps {
  empreendimento: EmpreendimentoData;
  unidades: UnidadeData[];
  series?: any[];
  className?: string;
}

type MaterialType = "book" | "condicoes" | "espelho" | "resumo";

const quickActions: Array<{
  type: MaterialType;
  icon: typeof BookOpen;
  label: string;
  color: string;
  requiresSeries?: boolean;
}> = [
  {
    type: "resumo",
    icon: FileText,
    label: "Resumo",
    color: "bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  {
    type: "book",
    icon: BookOpen,
    label: "Book Completo",
    color: "bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/20",
  },
  {
    type: "condicoes",
    icon: Table2,
    label: "Condições",
    color: "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    requiresSeries: true,
  },
  {
    type: "espelho",
    icon: BarChart3,
    label: "Espelho",
    color: "bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/20",
  },
];

export function QuickShareActions({
  empreendimento,
  unidades,
  series,
  className,
}: QuickShareActionsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [preSelectedType, setPreSelectedType] = useState<MaterialType | null>(null);

  const handleQuickShare = (type: MaterialType) => {
    setPreSelectedType(type);
    setModalOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      // Reset pre-selection when modal closes
      setTimeout(() => setPreSelectedType(null), 200);
    }
  };

  return (
    <>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {quickActions.map((action) => {
          const Icon = action.icon;
          const isAvailable = !action.requiresSeries || (series && series.length > 0);

          return (
            <Button
              key={action.type}
              variant="outline"
              size="sm"
              disabled={!isAvailable}
              onClick={() => isAvailable && handleQuickShare(action.type)}
              className={cn(
                "gap-2 border transition-all",
                isAvailable ? action.color : "opacity-50 cursor-not-allowed"
              )}
            >
              <Icon className="w-4 h-4" />
              {action.label}
            </Button>
          );
        })}
      </div>

      <ShareModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        empreendimento={empreendimento}
        unidades={unidades}
        series={series}
        preSelectedType={preSelectedType || undefined}
      />
    </>
  );
}
