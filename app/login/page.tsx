"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone, Loader2, MessageSquare, CheckCircle2, AlertCircle, ArrowLeft, Sparkles } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { AnimatedBackground } from "@/components/animated-background";

type LoginStep = "phone" | "link_sent" | "not_registered" | "register";

// Glow button component with animated gradient
function GlowButton({
  children,
  onClick,
  disabled,
  className
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className="relative group">
      {/* Outer glow */}
      <div className={cn(
        "absolute -inset-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-2xl blur-lg opacity-60 transition-all duration-500",
        disabled ? "opacity-20" : "group-hover:opacity-100 group-hover:blur-xl"
      )} />

      {/* Inner glow ring */}
      <div className={cn(
        "absolute -inset-0.5 bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 rounded-xl opacity-0 transition-opacity duration-300",
        !disabled && "group-hover:opacity-75"
      )} />

      {/* Button */}
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "relative w-full h-14 px-8 rounded-xl font-medium text-base",
          "bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600",
          "text-white shadow-lg",
          "transform transition-all duration-300",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
          !disabled && "hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-500/25 active:scale-[0.98]",
          className
        )}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>

        {/* Shine effect */}
        <div className="absolute inset-0 rounded-xl overflow-hidden">
          <div className={cn(
            "absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent",
            !disabled && "group-hover:animate-shine"
          )} />
        </div>
      </button>
    </div>
  );
}

// Animated OTP Input with individual boxes
function OTPInput({
  value,
  onChange,
  onComplete,
  error,
  disabled
}: {
  value: string[];
  onChange: (value: string[]) => void;
  onComplete?: () => void;
  error?: boolean;
  disabled?: boolean;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const handleChange = (index: number, newValue: string) => {
    if (newValue.length > 1) return;

    const newOtp = [...value];
    newOtp[index] = newValue.replace(/\D/g, "");
    onChange(newOtp);

    if (newValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every(d => d !== "") && onComplete) {
      // Small delay to ensure state is updated before calling onComplete
      setTimeout(onComplete, 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData) {
      const newOtp = [...value];
      pastedData.split("").forEach((char, index) => {
        if (index < 6) newOtp[index] = char;
      });
      onChange(newOtp);
      const lastIndex = Math.min(pastedData.length - 1, 5);
      inputRefs.current[lastIndex]?.focus();

      if (newOtp.every(d => d !== "") && onComplete) {
        setTimeout(onComplete, 100);
      }
    }
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {value.map((digit, index) => (
        <div
          key={index}
          className={cn(
            "relative transition-all duration-300",
            focusedIndex === index && "scale-110",
            "animate-fadeInUp"
          )}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {/* Glow ring for focused input */}
          {focusedIndex === index && (
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-green-400 rounded-xl blur opacity-50 animate-pulse" />
          )}

          {/* Error ring */}
          {error && (
            <div className="absolute -inset-0.5 bg-red-400 rounded-xl opacity-50 animate-shake" />
          )}

          <input
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex(null)}
            disabled={disabled}
            className={cn(
              "relative w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold",
              "bg-white/80 backdrop-blur-sm border-2 rounded-xl",
              "text-gray-900 placeholder-gray-300",
              "focus:outline-none focus:ring-0 transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error
                ? "border-red-400 bg-red-50/80"
                : digit
                  ? "border-emerald-400 bg-emerald-50/50"
                  : "border-gray-200 hover:border-gray-300"
            )}
          />

          {/* Bottom bar indicator */}
          <div className={cn(
            "absolute bottom-2 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-300",
            digit
              ? "w-6 bg-emerald-500"
              : focusedIndex === index
                ? "w-6 bg-emerald-400 animate-pulse"
                : "w-4 bg-gray-300"
          )} />
        </div>
      ))}
    </div>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();

  const [step, setStep] = useState<LoginStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Registration form fields
  const [regNome, setRegNome] = useState("");
  const [regImobiliaria, setRegImobiliaria] = useState("");
  const [regGerente, setRegGerente] = useState("");
  
  // Imobiliarias data
  const [imobiliarias, setImobiliarias] = useState<Array<{id: number, nome: string}>>([]);
  const [filteredImobiliarias, setFilteredImobiliarias] = useState<Array<{id: number, nome: string}>>([]);
  const [showImobDropdown, setShowImobDropdown] = useState(false);

  // Track if this is a new registration (to redirect to onboarding)
  const [isNewRegistration, setIsNewRegistration] = useState(false);

  // Check for error from magic link or admin redirect
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        token_missing: "Link inválido. Solicite um novo.",
        link_expired: "Link expirado. Solicite um novo.",
        user_inactive: "Usuário inativo. Contate seu gerente.",
        server_error: "Erro no servidor. Tente novamente.",
        admin_required: "Área restrita. Faça login como corretor ou gerente.",
        config_error: "Erro de configuração. Contate o suporte.",
        admin_error: "Erro ao acessar área admin. Tente novamente.",
      };
      setError(errorMessages[errorParam] || "Erro desconhecido.");
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, authLoading, router]);

  // Load imobiliarias when step changes to not_registered
  useEffect(() => {
    if (step === "not_registered") {
      fetch('/api/auth/imobiliarias')
        .then(res => res.json())
        .then(data => {
          // Add "Autônomo" as first option
          const autonomo = { id: 0, nome: 'Autônomo' };
          setImobiliarias([autonomo, ...data]);
          setFilteredImobiliarias([autonomo, ...data]);
        })
        .catch(error => {
          console.error('Error loading imobiliarias:', error);
          // Fallback to just "Autônomo"
          const autonomo = { id: 0, nome: 'Autônomo' };
          setImobiliarias([autonomo]);
          setFilteredImobiliarias([autonomo]);
        });
    }
  }, [step]);

  // Format phone as user types
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    if (formatted.replace(/\D/g, "").length <= 11) {
      setPhone(formatted);
    }
  };

  const handleSendMagicLink = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone: phone }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (!data.exists) {
        setStep("not_registered");
        return;
      }

      if (data.autoLogin && data.sessionId && data.user) {
        login(data.user, data.sessionId);
        router.push("/");
        return;
      }

      if (data.needsOnboarding) {
        setError("Complete seu cadastro pelo WhatsApp primeiro.");
        return;
      }

      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
      setUserName(data.user?.nome || "");
      setStep("link_sent");
    } catch (err) {
      setError("Erro ao enviar link. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (!sessionId || code.length !== 6) return;

    setLoading(true);
    setError(null);
    setOtpError(false);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, code, telefone: phone }),
      });

      const data = await res.json();

      if (data.error) {
        setOtpError(true);
        setError(data.error);
        // Reset OTP after error animation
        setTimeout(() => {
          setOtp(["", "", "", "", "", ""]);
          setOtpError(false);
        }, 600);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        login(data.user, data.sessionId);
        // Redirect new registrations to WhatsApp onboarding
        router.push(isNewRegistration ? "/onboarding/whatsapp" : "/");
      }, 1000);
    } catch (err) {
      setOtpError(true);
      setError("Erro ao verificar código. Tente novamente.");
      setTimeout(() => {
        setOtp(["", "", "", "", "", ""]);
        setOtpError(false);
      }, 600);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regNome.trim()) {
      setError("Por favor, informe seu nome");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefone: phone,
          nome: regNome.trim(),
          imobiliaria: regImobiliaria.trim() || "autonomo",
          gerente: regGerente.trim() || "nao tenho",
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      // Registration successful, mark as new registration and send OTP
      setIsNewRegistration(true);
      setSuccess(true);
      setTimeout(async () => {
        setSuccess(false);
        await handleSendMagicLink();
      }, 1500);
    } catch (err) {
      setError("Erro ao cadastrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Handle imobiliaria input change and filtering
  const handleImobiliariaChange = (value: string) => {
    setRegImobiliaria(value);
    
    if (value.trim() === '') {
      setFilteredImobiliarias(imobiliarias);
    } else {
      const filtered = imobiliarias.filter(imob => 
        imob.nome.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredImobiliarias(filtered);
    }
    setShowImobDropdown(true);
  };

  // Handle imobiliaria selection
  const handleImobiliariaSelect = (imob: {id: number, nome: string}) => {
    setRegImobiliaria(imob.nome);
    setShowImobDropdown(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50">
        <AnimatedBackground />
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
          <div className="relative h-14 w-14 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <AnimatedBackground />

      {/* Header */}
      <header className="relative z-10 p-6 animate-fadeInDown">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-400 rounded-xl blur-lg opacity-30" />
            <Image
              src="/logo-pratica-icon.svg"
              alt="Pratica Incorporadora"
              width={48}
              height={48}
              className="relative h-12 w-12 drop-shadow-lg"
            />
          </div>
          <span className="font-semibold text-lg text-gray-800">Pratica Incorporadora</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fadeInUp">
          {/* Card */}
          <div className="relative">
            {/* Card glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 rounded-[2rem] blur-xl opacity-20" />

            <div className="relative bg-white/70 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-emerald-900/10 border border-white/60 overflow-hidden">
              {/* Animated top border */}
              <div className="h-1 bg-gradient-to-r from-emerald-400 via-green-500 to-teal-400 animate-gradient" />

              <div className="p-8">
                {/* Step: Phone */}
                {step === "phone" && (
                  <div className="space-y-6">
                    {/* Icon with glow */}
                    <div className="flex justify-center animate-fadeInDown">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl blur-xl opacity-50" />
                        <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                          <MessageSquare className="h-10 w-10 text-white" />
                          <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-yellow-300 animate-pulse" />
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="text-center space-y-2 animate-fadeInUp" style={{ animationDelay: "100ms" }}>
                      <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                        Bem-vindo
                      </h1>
                      <p className="text-gray-500">Digite seu número de WhatsApp</p>
                    </div>

                    {/* Phone input */}
                    <div className="space-y-4 animate-fadeInUp" style={{ animationDelay: "200ms" }}>
                      <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-green-400 rounded-xl opacity-0 group-focus-within:opacity-50 blur transition-opacity duration-300" />
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 transition-colors group-focus-within:text-emerald-500" />
                          <Input
                            type="tel"
                            placeholder="(11) 99999-9999"
                            value={phone}
                            onChange={handlePhoneChange}
                            className="pl-12 h-14 text-lg bg-white/80 border-gray-200 rounded-xl focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all"
                            autoFocus
                          />
                        </div>
                      </div>

                      {error && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50/80 border border-red-200 animate-shake">
                          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                          <span className="text-sm text-red-600">{error}</span>
                        </div>
                      )}

                      <GlowButton
                        onClick={handleSendMagicLink}
                        disabled={loading || phone.replace(/\D/g, "").length < 10}
                      >
                        {loading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <MessageSquare className="h-5 w-5" />
                            Receber código no WhatsApp
                          </>
                        )}
                      </GlowButton>
                    </div>

                    <p className="text-xs text-gray-400 text-center animate-fadeInUp" style={{ animationDelay: "300ms" }}>
                      Você receberá um código de 6 dígitos no WhatsApp
                    </p>
                  </div>
                )}

                {/* Step: Link Sent (OTP Input) */}
                {step === "link_sent" && (
                  <div className="space-y-6">
                    {/* Back button */}
                    <button
                      onClick={() => {
                        setStep("phone");
                        setOtp(["", "", "", "", "", ""]);
                        setError(null);
                        setSuccess(false);
                      }}
                      className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors animate-fadeInLeft"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span className="text-sm">Voltar</span>
                    </button>

                    {/* Success/Check icon */}
                    <div className="flex justify-center animate-fadeInDown">
                      <div className="relative">
                        <div className={cn(
                          "absolute inset-0 rounded-2xl blur-xl opacity-50 transition-colors duration-500",
                          success ? "bg-green-500" : "bg-gradient-to-br from-emerald-400 to-green-500"
                        )} />
                        <div className={cn(
                          "relative h-20 w-20 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500",
                          success
                            ? "bg-green-500 scale-110"
                            : "bg-gradient-to-br from-emerald-400 to-green-500 shadow-emerald-500/30"
                        )}>
                          <CheckCircle2 className={cn(
                            "text-white transition-all duration-500",
                            success ? "h-12 w-12" : "h-10 w-10"
                          )} />
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="text-center space-y-2 animate-fadeInUp" style={{ animationDelay: "100ms" }}>
                      <h1 className={cn(
                        "text-2xl font-bold transition-colors duration-500",
                        success ? "text-green-600" : "text-gray-900"
                      )}>
                        {success ? "Verificado!" : "Código enviado!"}
                      </h1>
                      {!success && (
                        userName ? (
                          <p className="text-gray-500">
                            Olá <span className="font-semibold text-emerald-600">{userName}</span>, digite o código
                          </p>
                        ) : (
                          <p className="text-gray-500">Digite o código que enviamos no WhatsApp</p>
                        )
                      )}
                    </div>

                    {/* OTP Input */}
                    {!success && (
                      <>
                        <div className="animate-fadeInUp" style={{ animationDelay: "200ms" }}>
                          <OTPInput
                            value={otp}
                            onChange={setOtp}
                            onComplete={handleVerifyOtp}
                            error={otpError}
                            disabled={loading}
                          />
                        </div>

                        {error && (
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50/80 border border-red-200 animate-shake">
                            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                            <span className="text-sm text-red-600">{error}</span>
                          </div>
                        )}

                        <div className="animate-fadeInUp" style={{ animationDelay: "300ms" }}>
                          <GlowButton
                            onClick={handleVerifyOtp}
                            disabled={loading || otp.some(d => d === "")}
                          >
                            {loading ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              "Entrar"
                            )}
                          </GlowButton>
                        </div>

                        {/* Divider */}
                        <div className="relative animate-fadeInUp" style={{ animationDelay: "400ms" }}>
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white/70 px-3 text-gray-400">ou</span>
                          </div>
                        </div>

                        {/* Magic link info */}
                        <div className="text-center p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100 animate-fadeInUp" style={{ animationDelay: "500ms" }}>
                          <p className="text-sm text-emerald-700">
                            Também enviamos um <strong>link de acesso rápido</strong> no WhatsApp
                          </p>
                        </div>

                        {/* Resend button */}
                        <div className="text-center animate-fadeInUp" style={{ animationDelay: "600ms" }}>
                          <span className="text-sm text-gray-500">Não recebeu? </span>
                          <button
                            onClick={handleSendMagicLink}
                            disabled={loading}
                            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline transition-colors disabled:opacity-50"
                          >
                            Reenviar código
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Step: Not Registered / Register */}
                {step === "not_registered" && (
                  <div className="space-y-6">
                    {/* Back button */}
                    <button
                      onClick={() => {
                        setStep("phone");
                        setPhone("");
                        setError(null);
                        setRegNome("");
                        setRegImobiliaria("");
                        setRegGerente("");
                      }}
                      className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors animate-fadeInLeft"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span className="text-sm">Voltar</span>
                    </button>

                    {/* Success/Check icon */}
                    <div className="flex justify-center animate-fadeInDown">
                      <div className="relative">
                        <div className={cn(
                          "absolute inset-0 rounded-2xl blur-xl opacity-50 transition-colors duration-500",
                          success ? "bg-green-500" : "bg-gradient-to-br from-emerald-400 to-green-500"
                        )} />
                        <div className={cn(
                          "relative h-20 w-20 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500",
                          success
                            ? "bg-green-500 scale-110"
                            : "bg-gradient-to-br from-emerald-400 to-green-500 shadow-emerald-500/30"
                        )}>
                          <MessageSquare className={cn(
                            "text-white transition-all duration-500",
                            success ? "h-12 w-12" : "h-10 w-10"
                          )} />
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="text-center space-y-2 animate-fadeInUp" style={{ animationDelay: "100ms" }}>
                      <h1 className={cn(
                        "text-2xl font-bold transition-colors duration-500",
                        success ? "text-green-600" : "text-gray-900"
                      )}>
                        {success ? "Cadastro realizado!" : "Faça seu cadastro"}
                      </h1>
                      {!success && (
                        <p className="text-gray-500">
                          O número <strong className="font-semibold">{phone}</strong> não está cadastrado. Cadastre-se agora!
                        </p>
                      )}
                    </div>

                    {!success && (
                      <>
                        {/* Registration Form */}
                        <div className="space-y-4 animate-fadeInUp" style={{ animationDelay: "200ms" }}>
                          {/* Nome */}
                          <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-green-400 rounded-xl opacity-0 group-focus-within:opacity-50 blur transition-opacity duration-300" />
                            <div className="relative">
                              <Input
                                type="text"
                                placeholder="Nome completo *"
                                value={regNome}
                                onChange={(e) => setRegNome(e.target.value)}
                                className="h-14 text-base bg-white/80 border-gray-200 rounded-xl focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all"
                                autoFocus
                              />
                            </div>
                          </div>

                          {/* Imobiliária */}
                          <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-green-400 rounded-xl opacity-0 group-focus-within:opacity-50 blur transition-opacity duration-300" />
                            <div className="relative">
                              <Input
                                type="text"
                                placeholder="Imobiliária (digite para buscar)"
                                value={regImobiliaria}
                                onChange={(e) => handleImobiliariaChange(e.target.value)}
                                onFocus={() => setShowImobDropdown(true)}
                                onBlur={() => setTimeout(() => setShowImobDropdown(false), 150)}
                                className="h-14 text-base bg-white/80 border-gray-200 rounded-xl focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all"
                                autoComplete="off"
                              />
                              
                              {/* Dropdown with suggestions */}
                              {showImobDropdown && filteredImobiliarias.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50">
                                  {filteredImobiliarias.slice(0, 10).map((imob, index) => (
                                    <button
                                      key={imob.id}
                                      type="button"
                                      onClick={() => handleImobiliariaSelect(imob)}
                                      className={cn(
                                        "w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors",
                                        index === 0 && "rounded-t-xl",
                                        index === filteredImobiliarias.length - 1 && "rounded-b-xl",
                                        imob.id === 0 && "font-semibold text-emerald-600 border-b border-emerald-100"
                                      )}
                                    >
                                      {imob.nome}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Gerente */}
                          <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-green-400 rounded-xl opacity-0 group-focus-within:opacity-50 blur transition-opacity duration-300" />
                            <div className="relative">
                              <Input
                                type="text"
                                placeholder="Nome do gerente (opcional)"
                                value={regGerente}
                                onChange={(e) => setRegGerente(e.target.value)}
                                className="h-14 text-base bg-white/80 border-gray-200 rounded-xl focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all"
                              />
                            </div>
                          </div>

                          {error && (
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50/80 border border-red-200 animate-shake">
                              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                              <span className="text-sm text-red-600">{error}</span>
                            </div>
                          )}

                          <GlowButton
                            onClick={handleRegister}
                            disabled={loading || !regNome.trim()}
                          >
                            {loading ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="h-5 w-5" />
                                Cadastrar e continuar
                              </>
                            )}
                          </GlowButton>
                        </div>

                        <p className="text-xs text-gray-400 text-center animate-fadeInUp" style={{ animationDelay: "300ms" }}>
                          * Campo obrigatório
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center text-sm text-gray-400 animate-fadeInUp" style={{ animationDelay: "400ms" }}>
        Pratica Incorporadora &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50">
      <AnimatedBackground />
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
        <div className="relative h-14 w-14 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
