"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface SendToWhatsAppProps {
  type: "empreendimento" | "tabela" | "simulacao";
  data: any;
  variant?: "default" | "outline" | "ghost";
  className?: string;
  label?: string;
}

type Status = "idle" | "loading" | "success" | "error";

export function SendToWhatsApp({
  type,
  data,
  variant = "default",
  className,
  label = "Me manda no Whats",
}: SendToWhatsAppProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Reset status after 3 seconds
  useEffect(() => {
    if (status === "success" || status === "error") {
      const timer = setTimeout(() => {
        setStatus("idle");
        setErrorMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleSend = async () => {
    if (!user?.id) {
      setStatus("error");
      setErrorMessage("Faça login primeiro");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          type,
          data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Erro ao enviar");
      }

      setStatus("success");
    } catch (error) {
      console.error("Erro ao enviar para WhatsApp:", error);
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Tente novamente"
      );
    }
  };

  const getButtonContent = () => {
    switch (status) {
      case "loading":
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        );
      case "success":
        return (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Enviado!
          </>
        );
      case "error":
        return (
          <>
            <XCircle className="mr-2 h-4 w-4" />
            {errorMessage || "Erro"}
          </>
        );
      default:
        return (
          <>
            <MessageSquare className="mr-2 h-4 w-4" />
            {label}
          </>
        );
    }
  };

  return (
    <Button
      variant={status === "error" ? "destructive" : status === "success" ? "outline" : variant}
      className={cn(
        className,
        status === "success" && "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20",
      )}
      onClick={handleSend}
      disabled={status === "loading"}
    >
      {getButtonContent()}
    </Button>
  );
}
