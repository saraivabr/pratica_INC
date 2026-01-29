"use client";

import React from "react";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lock } from "lucide-react";

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  // Quando bloqueado, mostra children desabilitado com tooltip
  showDisabled?: boolean;
  // Mensagem customizada quando bloqueado
  message?: string;
  // Componente alternativo quando bloqueado (se não usar showDisabled)
  fallback?: React.ReactNode;
  // Não renderiza nada se bloqueado (útil para esconder completamente)
  hideWhenBlocked?: boolean;
}

export function FeatureGate({
  feature,
  children,
  showDisabled = true,
  message,
  fallback,
  hideWhenBlocked = false,
}: FeatureGateProps) {
  const { allowed, blocked, loading, message: defaultMessage } = useFeatureAccess(feature);

  // Durante o carregamento, mostra o children normalmente (evita flicker)
  if (loading) {
    return <>{children}</>;
  }

  // Se tem acesso, renderiza normalmente
  if (allowed) {
    return <>{children}</>;
  }

  // Se bloqueado e deve esconder completamente
  if (hideWhenBlocked) {
    return null;
  }

  // Se tem fallback customizado
  if (fallback) {
    return <>{fallback}</>;
  }

  // Se deve mostrar desabilitado com tooltip
  if (showDisabled) {
    const displayMessage = message || defaultMessage;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative inline-block">
              <div className="opacity-50 pointer-events-none select-none">
                {children}
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{displayMessage}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Fallback: não renderiza nada
  return null;
}

// Componente para proteger rotas/páginas inteiras
interface FeaturePageGuardProps {
  feature: string;
  children: React.ReactNode;
  // Título da página (para a mensagem de bloqueio)
  title?: string;
}

export function FeaturePageGuard({
  feature,
  children,
  title = "Esta página",
}: FeaturePageGuardProps) {
  const { allowed, loading, message } = useFeatureAccess(feature);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="p-4 rounded-full bg-muted">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground text-center max-w-md">
          {title} requer permissão especial. {message}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

// Componente para menu items
interface FeatureMenuItemProps {
  feature: string;
  children: React.ReactNode;
  // Se true, esconde completamente quando bloqueado
  hideWhenBlocked?: boolean;
}

export function FeatureMenuItem({
  feature,
  children,
  hideWhenBlocked = false,
}: FeatureMenuItemProps) {
  const { allowed, loading, message } = useFeatureAccess(feature);

  if (loading) {
    return <>{children}</>;
  }

  if (!allowed && hideWhenBlocked) {
    return null;
  }

  if (!allowed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="opacity-50 cursor-not-allowed">
              {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                  return React.cloneElement(child as React.ReactElement<any>, {
                    onClick: (e: React.MouseEvent) => e.preventDefault(),
                    className: `${(child.props as any).className || ""} pointer-events-none`,
                  });
                }
                return child;
              })}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="flex items-center gap-2">
              <Lock className="h-3 w-3" />
              {message}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <>{children}</>;
}
