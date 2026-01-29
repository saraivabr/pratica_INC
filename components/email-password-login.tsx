"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EmailPasswordLoginProps {
  onSwitchToOTP?: () => void;
  onSuccess?: (userData: any) => void;
}

export function EmailPasswordLogin({ onSwitchToOTP, onSuccess }: EmailPasswordLoginProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erro ao fazer login");
        setLoading(false);
        return;
      }

      // Salvar sessão no cookie
      const sessionData = {
        userId: data.user.id,
        phone: data.user.telefone || "",
        role: data.user.role,
        workspaceId: data.user.workspace_id,
      };

      document.cookie = `pratica-session=${encodeURIComponent(
        JSON.stringify(sessionData)
      )}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(data.user);
      }

      // Redirecionar para dashboard
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("[EmailPasswordLogin] Error:", err);
      setError("Erro ao conectar com o servidor");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Login com Email</h2>
        <p className="text-sm text-gray-500">
          Entre com seu email e senha cadastrados
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email Input */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-green-400 rounded-xl opacity-0 group-focus-within:opacity-50 blur transition-opacity duration-300" />
          <div className="relative flex items-center">
            <Mail className="absolute left-4 h-5 w-5 text-gray-400" />
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="h-14 pl-12 text-base bg-white/80 border-gray-200 rounded-xl focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all"
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-green-400 rounded-xl opacity-0 group-focus-within:opacity-50 blur transition-opacity duration-300" />
          <div className="relative flex items-center">
            <Lock className="absolute left-4 h-5 w-5 text-gray-400" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Senha (mínimo 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={loading}
              className="h-14 pl-12 pr-12 text-base bg-white/80 border-gray-200 rounded-xl focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50/80 border border-red-200 animate-shake">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading || !email || !password}
          className={cn(
            "w-full h-14 text-base rounded-xl",
            "bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600",
            "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
            "transition-all duration-300",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          )}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Entrar"
          )}
        </Button>
      </form>

      {/* Switch to OTP */}
      {onSwitchToOTP && (
        <div className="text-center">
          <button
            type="button"
            onClick={onSwitchToOTP}
            className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
          >
            Prefiro usar WhatsApp (código OTP)
          </button>
        </div>
      )}

      {/* Forgot Password - placeholder for future */}
      <div className="text-center">
        <button
          type="button"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          onClick={() => alert("Funcionalidade em desenvolvimento. Entre em contato com seu gerente.")}
        >
          Esqueci minha senha
        </button>
      </div>
    </div>
  );
}
