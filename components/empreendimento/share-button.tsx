"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
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

interface ShareButtonProps {
  empreendimento: EmpreendimentoData;
  unidades: UnidadeData[];
  series?: any[];
  simulacao?: {
    valorImovel: number;
    entrada: number;
    percentualEntrada: number;
    valorFinanciado: number;
    prazoMeses: number;
    taxaAnual: number;
    parcelaMensal: number;
    totalPago: number;
    totalJuros: number;
  };
  unidade?: UnidadeData;
  variant?: "default" | "floating" | "inline";
  className?: string;
  disabled?: boolean;
}

export function ShareButton({
  empreendimento,
  unidades,
  series,
  simulacao,
  unidade,
  variant = "default",
  className,
  disabled = false,
}: ShareButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (variant === "floating") {
    return (
      <>
        <Button
          size="lg"
          disabled={disabled}
          className={cn(
            "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 shadow-lg gap-2",
            "bg-green-600 hover:bg-green-700 text-white",
            "px-6 py-6 rounded-full",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          onClick={() => !disabled && setModalOpen(true)}
        >
          <MessageSquare className="w-5 h-5" />
          Me manda no WhatsApp
        </Button>

        <ShareModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          empreendimento={empreendimento}
          unidades={unidades}
          series={series}
          simulacao={simulacao}
          unidade={unidade}
        />
      </>
    );
  }

  if (variant === "inline") {
    return (
      <>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn("gap-2", className)}
          onClick={() => !disabled && setModalOpen(true)}
        >
          <MessageSquare className="w-4 h-4" />
          Enviar no WhatsApp
        </Button>

        <ShareModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          empreendimento={empreendimento}
          unidades={unidades}
          series={series}
          simulacao={simulacao}
          unidade={unidade}
        />
      </>
    );
  }

  return (
    <>
      <Button
        size="lg"
        disabled={disabled}
        className={cn(
          "w-full gap-2 bg-green-600 hover:bg-green-700",
          className
        )}
        onClick={() => !disabled && setModalOpen(true)}
      >
        <MessageSquare className="w-5 h-5" />
        Me manda no WhatsApp
      </Button>

      <ShareModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        empreendimento={empreendimento}
        unidades={unidades}
        series={series}
        simulacao={simulacao}
        unidade={unidade}
      />
    </>
  );
}
