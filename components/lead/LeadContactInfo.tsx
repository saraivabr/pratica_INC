"use client";

/**
 * @fileoverview Componente para exibicao de informacoes de contato do lead
 * @description Exibe email, telefone e celular/WhatsApp com acoes de copia e link
 */

import { useState, useCallback, useMemo } from "react";
import { Mail, Phone, MessageCircle, Copy, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LeadContactInfoProps, CopiedState, ContactConfig } from "@/types/lead";

/**
 * Tipo para os tipos de contato disponiveis
 */
type ContactType = "email" | "telefone" | "celular";

/**
 * Formata numero de telefone para WhatsApp
 * @param number - Numero de telefone
 * @returns Numero formatado para URL do WhatsApp
 */
function formatWhatsAppNumber(number: string): string {
  const cleaned = number.replace(/\D/g, "");
  if (cleaned.length <= 11) {
    return `55${cleaned}`;
  }
  return cleaned;
}

/**
 * Componente de informacoes de contato do lead
 * @description Exibe cards de contato com opcoes de copia e acao direta
 * @param props - Props do componente
 * @param props.email - Email do lead
 * @param props.telefone - Telefone fixo do lead
 * @param props.celular - Celular/WhatsApp do lead
 */
export function LeadContactInfo({
  email,
  telefone,
  celular
}: LeadContactInfoProps) {
  const [copiedStates, setCopiedStates] = useState<CopiedState>({});

  /**
   * Copia texto para a area de transferencia
   */
  const copyToClipboard = useCallback(async (text: string, type: ContactType) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates((prev) => ({ ...prev, [type]: true }));
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [type]: false }));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, []);

  /**
   * Configuracao dos contatos disponiveis
   */
  const contacts = useMemo(() => {
    const allContacts: Array<ContactConfig & { value: string | undefined }> = [
      {
        type: "email",
        value: email ?? undefined,
        href: email ? `mailto:${email}` : undefined,
        icon: Mail,
        label: "Email",
        actionLabel: "Enviar email",
        gradient: "from-blue-500 to-cyan-500",
        bgGlow: "bg-blue-500/10 dark:bg-blue-500/20",
        iconBg: "bg-gradient-to-br from-blue-500 to-cyan-500",
        ringColor: "ring-blue-500/20 dark:ring-blue-400/30",
        hoverRing: "hover:ring-blue-500/40 dark:hover:ring-blue-400/50",
      },
      {
        type: "telefone",
        value: telefone ?? undefined,
        href: telefone ? `tel:${telefone}` : undefined,
        icon: Phone,
        label: "Telefone",
        actionLabel: "Ligar",
        gradient: "from-violet-500 to-purple-500",
        bgGlow: "bg-violet-500/10 dark:bg-violet-500/20",
        iconBg: "bg-gradient-to-br from-violet-500 to-purple-500",
        ringColor: "ring-violet-500/20 dark:ring-violet-400/30",
        hoverRing: "hover:ring-violet-500/40 dark:hover:ring-violet-400/50",
      },
      {
        type: "celular",
        value: celular ?? undefined,
        href: celular ? `https://wa.me/${formatWhatsAppNumber(celular)}` : undefined,
        icon: MessageCircle,
        label: "WhatsApp",
        actionLabel: "Abrir WhatsApp",
        gradient: "from-emerald-500 to-green-500",
        bgGlow: "bg-emerald-500/10 dark:bg-emerald-500/20",
        iconBg: "bg-gradient-to-br from-emerald-500 to-green-500",
        ringColor: "ring-emerald-500/20 dark:ring-emerald-400/30",
        hoverRing: "hover:ring-emerald-500/40 dark:hover:ring-emerald-400/50",
      },
    ];

    return allContacts.filter((contact): contact is ContactConfig & { value: string } =>
      Boolean(contact.value)
    );
  }, [email, telefone, celular]);

  // Estado vazio
  if (contacts.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 p-6"
        role="status"
        aria-label="Nenhum contato disponivel"
      >
        <p className="text-sm text-muted-foreground">
          Nenhum contato disponivel
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "grid gap-3",
          contacts.length === 1
            ? "grid-cols-1"
            : contacts.length === 2
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
        )}
        role="list"
        aria-label="Informacoes de contato"
      >
        {contacts.map((contact) => {
          const Icon = contact.icon;
          const isCopied = copiedStates[contact.type];

          return (
            <div
              key={contact.type}
              className={cn(
                "group relative overflow-hidden rounded-xl",
                "bg-card/80 backdrop-blur-sm",
                "border border-border/50",
                "ring-2 ring-transparent",
                contact.ringColor,
                contact.hoverRing,
                "transition-all duration-300 ease-out",
                "hover:border-transparent hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20",
                "hover:-translate-y-0.5"
              )}
              role="listitem"
            >
              {/* Gradient glow effect on hover */}
              <div
                className={cn(
                  "absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                  contact.bgGlow
                )}
                aria-hidden="true"
              />

              {/* Content */}
              <div className="relative flex items-center gap-3 p-4">
                {/* Icon container */}
                <div
                  className={cn(
                    "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    contact.iconBg,
                    "shadow-md shadow-black/10 dark:shadow-black/30",
                    "transition-transform duration-300 group-hover:scale-105"
                  )}
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5 text-white" strokeWidth={2} />
                </div>

                {/* Text content */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                    {contact.label}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                    {contact.value}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  {/* Copy button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          copyToClipboard(contact.value, contact.type);
                        }}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg",
                          "bg-muted/50 hover:bg-muted",
                          "border border-border/50 hover:border-border",
                          "text-muted-foreground hover:text-foreground",
                          "transition-all duration-200",
                          "active:scale-95",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          isCopied && "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        )}
                        aria-label={isCopied ? "Copiado" : `Copiar ${contact.label}`}
                      >
                        {isCopied ? (
                          <Check className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Copy className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{isCopied ? "Copiado!" : "Copiar"}</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Action button (link) */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={contact.href}
                        target={contact.type === "celular" ? "_blank" : undefined}
                        rel={contact.type === "celular" ? "noopener noreferrer" : undefined}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg",
                          contact.iconBg,
                          "text-white",
                          "shadow-sm shadow-black/10 dark:shadow-black/30",
                          "transition-all duration-200",
                          "hover:shadow-md hover:brightness-110",
                          "active:scale-95",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        )}
                        aria-label={contact.actionLabel}
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{contact.actionLabel}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
