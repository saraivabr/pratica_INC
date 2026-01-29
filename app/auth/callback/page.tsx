"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AnimatedBackground } from "@/components/animated-background";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Autenticando...");

  useEffect(() => {
    const processAuth = async () => {
      try {
        const data = searchParams.get("data");

        if (!data) {
          setStatus("error");
          setMessage("Dados de autenticação não encontrados.");
          setTimeout(() => router.push("/login"), 2000);
          return;
        }

        // Decode the auth data
        const authData = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));

        if (!authData.sessionId || !authData.user) {
          setStatus("error");
          setMessage("Dados de autenticação inválidos.");
          setTimeout(() => router.push("/login"), 2000);
          return;
        }

        // Set auth state
        login(authData.user, authData.sessionId);

        setStatus("success");
        setMessage(`Bem-vindo, ${authData.user.nome || "Corretor"}!`);

        // Redirect to home
        setTimeout(() => router.push("/"), 1500);
      } catch (error) {
        console.error("Auth callback error:", error);
        setStatus("error");
        setMessage("Erro ao processar autenticação.");
        setTimeout(() => router.push("/login"), 2000);
      }
    };

    processAuth();
  }, [searchParams, login, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <AnimatedBackground />
      <div className="relative text-center space-y-4">
        {status === "loading" && (
          <>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
              <Loader2 className="relative h-12 w-12 animate-spin text-emerald-500 mx-auto" />
            </div>
            <p className="text-lg text-gray-600">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="relative">
              <div className="absolute inset-0 bg-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
              <CheckCircle2 className="relative h-12 w-12 text-green-500 mx-auto" />
            </div>
            <p className="text-lg font-medium text-green-600">{message}</p>
            <p className="text-sm text-gray-500">Redirecionando...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="relative">
              <div className="absolute inset-0 bg-red-400 rounded-full blur-xl opacity-30" />
              <XCircle className="relative h-12 w-12 text-red-500 mx-auto" />
            </div>
            <p className="text-lg text-red-600">{message}</p>
            <p className="text-sm text-gray-500">Redirecionando para login...</p>
          </>
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <AnimatedBackground />
      <div className="relative text-center space-y-4">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
          <Loader2 className="relative h-12 w-12 animate-spin text-emerald-500 mx-auto" />
        </div>
        <p className="text-lg text-gray-600">Carregando...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
