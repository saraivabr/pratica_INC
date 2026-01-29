"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Building2,
  Calendar,
  BedDouble,
  Car,
  Maximize,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageCircle,
  Check,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedBackground } from "@/components/animated-background";

interface ShareLandingProps {
  empreendimento: {
    id: string;
    nome: string;
    cidade?: string;
    bairro?: string;
    tipo?: string;
    construtora?: string;
    previsaoEntrega?: string;
    descricao?: string;
    diferenciais?: string[];
    imagemPrincipal?: string;
    imagens?: string[];
    precoMinimo?: number;
    precoMaximo?: number;
  };
  unidades: Array<{
    id: string;
    tipo: string;
    metragem: number;
    valor: number;
    status: string;
    quartos: number;
    vagas: number;
    andar?: number;
    final?: string;
  }>;
  corretor?: {
    nome: string;
    telefone: string;
  };
}

function formatCurrency(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 13) {
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
  }
  return phone;
}

export function ShareLanding({ empreendimento, unidades, corretor }: ShareLandingProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const allImages = [empreendimento.imagemPrincipal, ...(empreendimento.imagens || [])].filter((img): img is string => Boolean(img));
  const disponiveis = unidades.filter((u) => u.status === "disponivel");
  const hasPrice = typeof empreendimento.precoMinimo === "number" && empreendimento.precoMinimo > 0;

  const whatsappNumber = corretor?.telefone?.replace(/\D/g, "");
  const whatsappMessage = encodeURIComponent(
    `Oi${corretor ? ` ${corretor.nome}` : ""}! Vi o empreendimento ${empreendimento.nome} e gostaria de saber mais informacoes.`
  );
  const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${whatsappMessage}` : "";

  const nextImage = () => {
    if (allImages.length === 0) return;
    setCurrentImage((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    if (allImages.length === 0) return;
    setCurrentImage((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <AnimatedBackground />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-200">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-emerald-600">PRATICA</span>
          </div>
          {corretor && (
            <Button size="sm" asChild>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4 mr-2" />
                Falar com {corretor.nome.split(" ")[0]}
              </a>
            </Button>
          )}
        </div>
      </header>

      {/* Hero Image */}
      <section className="relative">
        <div className="relative aspect-[16/10] md:aspect-[21/9] w-full overflow-hidden bg-muted">
          {allImages[currentImage] && (
            <Image
              src={allImages[currentImage]}
              alt={empreendimento.nome}
              fill
              className="object-cover"
              priority
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Navigation */}
          {allImages.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {allImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      i === currentImage ? "bg-white w-6" : "bg-white/50"
                    )}
                  />
                ))}
              </div>
            </>
          )}

          {/* Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="container mx-auto">
              <div className="flex flex-wrap gap-2 mb-3">
                {empreendimento.tipo && (
                  <Badge className="bg-primary/90 text-primary-foreground">
                    {empreendimento.tipo === "apartamento"
                      ? "Apartamento"
                      : empreendimento.tipo === "casa"
                        ? "Casa"
                        : empreendimento.tipo}
                  </Badge>
                )}
                <Badge className="bg-emerald-500/90 text-white">
                  {disponiveis.length} disponíveis
                </Badge>
              </div>
              <h1 className="text-2xl md:text-4xl font-bold mb-2">{empreendimento.nome}</h1>
              {(empreendimento.bairro || empreendimento.cidade) && (
                <p className="flex items-center gap-1 text-white/90 text-sm md:text-base">
                  <MapPin className="w-4 h-4" />
                  {[empreendimento.bairro, empreendimento.cidade].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Price & CTA */}
      <section className="bg-background border-b sticky top-14 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">A partir de</p>
              <p className="text-2xl md:text-3xl font-bold text-primary">
                {hasPrice ? formatCurrency(empreendimento.precoMinimo) : "Consulte valores"}
              </p>
            </div>
            {whatsappLink && (
              <Button size="lg" className="w-full sm:w-auto gap-2" asChild>
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5" />
                  Quero saber mais
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8 space-y-12">
        {/* Diferenciais */}
        {(empreendimento.diferenciais || []).length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Diferenciais
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {(empreendimento.diferenciais || []).map((dif, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border"
                >
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-sm">{dif}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sobre */}
        {empreendimento.descricao && (
          <section>
            <h2 className="text-xl font-bold mb-4">Sobre o Empreendimento</h2>
            <p className="text-muted-foreground leading-relaxed">{empreendimento.descricao}</p>
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
              {empreendimento.construtora && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {empreendimento.construtora}
                </span>
              )}
              {empreendimento.previsaoEntrega && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Entrega: {empreendimento.previsaoEntrega}
                </span>
              )}
            </div>
          </section>
        )}

        {/* Unidades Disponíveis */}
        {disponiveis.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4">
              Unidades Disponíveis ({disponiveis.length})
            </h2>
            <div className="grid gap-3">
              {disponiveis.slice(0, 6).map((unidade) => (
                <Card key={unidade.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">
                            {unidade.andar ? `${unidade.andar}${unidade.final || ""}` : unidade.tipo}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {unidade.tipo}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Maximize className="w-3 h-3" />
                            {unidade.metragem}m²
                          </span>
                          {unidade.quartos > 0 && (
                            <span className="flex items-center gap-1">
                              <BedDouble className="w-3 h-3" />
                              {unidade.quartos} quartos
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Car className="w-3 h-3" />
                            {unidade.vagas} vagas
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-primary">
                          {formatCurrency(unidade.valor)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(unidade.valor / unidade.metragem)}/m²
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {disponiveis.length > 6 && (
                <p className="text-center text-sm text-muted-foreground">
                  E mais {disponiveis.length - 6} unidades disponíveis
                </p>
              )}
            </div>
          </section>
        )}

        {/* CTA Final */}
        <section className="bg-primary/5 border border-primary/20 rounded-2xl p-6 md:p-8 text-center">
          <h2 className="text-xl md:text-2xl font-bold mb-2">
            Interessado neste empreendimento?
          </h2>
          <p className="text-muted-foreground mb-6">
            {corretor
              ? `Fale diretamente com ${corretor.nome} e tire todas as suas dúvidas.`
              : "Entre em contato e tire todas as suas dúvidas."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="gap-2" asChild>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-5 h-5" />
                Chamar no WhatsApp
              </a>
            </Button>
            {corretor && (
              <Button size="lg" variant="outline" className="gap-2" asChild>
                <a href={`tel:${corretor.telefone}`}>
                  <Phone className="w-5 h-5" />
                  {formatPhone(corretor.telefone)}
                </a>
              </Button>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>
          <span className="font-semibold text-primary">PRATICA</span> Incorporadora
        </p>
        {corretor && (
          <p className="mt-1">
            Material compartilhado por {corretor.nome}
          </p>
        )}
      </footer>
    </div>
  );
}
