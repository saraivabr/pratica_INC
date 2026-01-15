"use client"

import { useSession, signOut } from "next-auth/react"
import {
  LogOut,
  User,
  Phone,
  Bell,
  Shield,
  HelpCircle,
  ChevronRight,
  Award,
  Target,
  TrendingUp,
} from "lucide-react"

function PerfilSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="skeleton-luxury w-20 h-20 rounded-2xl" />
        <div className="space-y-3">
          <div className="skeleton-luxury h-6 w-40 rounded-lg" />
          <div className="skeleton-luxury h-4 w-32 rounded-lg" />
        </div>
      </div>
      <div className="skeleton-luxury h-32 w-full rounded-2xl" />
    </div>
  )
}

export default function PerfilPage() {
  const { data: session, status } = useSession()

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  const isLoading = status === "loading"

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "CO"

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-[#E5E2DC]">
        <div className="px-5 pt-6 pb-4">
          <p className="text-[#C9A962] text-xs font-semibold tracking-[0.15em] uppercase mb-1">
            Minha Conta
          </p>
          <h1 className="font-display text-3xl font-semibold text-[#1B4332]">
            Perfil
          </h1>
        </div>
      </header>

      <main className="px-5 py-6">
        {isLoading ? (
          <PerfilSkeleton />
        ) : (
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl border border-[#E5E2DC] p-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center">
                  <span className="text-white text-xl font-display font-semibold">
                    {initials}
                  </span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-[#1A1A1A]">
                    {session?.user?.name || "Corretor"}
                  </h2>
                  {session?.user?.whatsapp && (
                    <div className="flex items-center gap-2 text-[#8A8A8A] mt-1">
                      <Phone className="w-3.5 h-3.5" />
                      <span className="text-sm">{session.user.whatsapp}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats - Em Breve */}
            <div className="bg-white rounded-2xl border border-[#E5E2DC] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#1A1A1A]">Minhas Metricas</h3>
                <span className="text-[10px] bg-[#1B4332]/10 text-[#1B4332] px-2.5 py-1 rounded-full font-semibold">
                  Em breve
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 opacity-50">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-xl bg-[#F0EDE8] flex items-center justify-center mx-auto mb-2">
                    <Target className="w-5 h-5 text-[#8A8A8A]" />
                  </div>
                  <p className="text-lg font-display font-semibold text-[#1A1A1A]">--</p>
                  <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Leads</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-xl bg-[#F0EDE8] flex items-center justify-center mx-auto mb-2">
                    <TrendingUp className="w-5 h-5 text-[#8A8A8A]" />
                  </div>
                  <p className="text-lg font-display font-semibold text-[#1A1A1A]">--</p>
                  <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Vendas</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-xl bg-[#F0EDE8] flex items-center justify-center mx-auto mb-2">
                    <Award className="w-5 h-5 text-[#8A8A8A]" />
                  </div>
                  <p className="text-lg font-display font-semibold text-[#1A1A1A]">--</p>
                  <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Ranking</p>
                </div>
              </div>
            </div>

            {/* Menu Options */}
            <div className="bg-white rounded-2xl border border-[#E5E2DC] overflow-hidden">
              <MenuItem
                icon={Bell}
                label="Notificacoes"
                badge="Em breve"
              />
              <MenuItem
                icon={Shield}
                label="Privacidade"
                badge="Em breve"
              />
              <MenuItem
                icon={HelpCircle}
                label="Ajuda e Suporte"
                badge="Em breve"
              />
            </div>

            {/* Prática Info */}
            <div className="bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] rounded-2xl p-5 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <span className="font-display text-xl font-semibold">P</span>
                </div>
                <div>
                  <h3 className="font-semibold">Pratica Construtora</h3>
                  <p className="text-white/60 text-sm">25+ anos de experiencia</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-display font-semibold">3k+</p>
                  <p className="text-[10px] text-white/60 uppercase tracking-wider">Clientes</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-display font-semibold">6</p>
                  <p className="text-[10px] text-white/60 uppercase tracking-wider">Empreendimentos</p>
                </div>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 h-14 bg-white border border-red-200 text-red-500 rounded-2xl font-medium hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sair da conta
            </button>

            {/* Version */}
            <p className="text-center text-[11px] text-[#8A8A8A]">
              Pratica Catalogo v1.0.0
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

function MenuItem({
  icon: Icon,
  label,
  badge,
}: {
  icon: React.ElementType
  label: string
  badge?: string
}) {
  return (
    <button
      disabled={!!badge}
      className="w-full flex items-center justify-between p-4 border-b border-[#F0EDE8] last:border-0 hover:bg-[#FAF9F7] transition-colors disabled:opacity-60"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#F0EDE8] flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#5C5C5C]" />
        </div>
        <span className="font-medium text-[#1A1A1A]">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="text-[10px] bg-[#F0EDE8] text-[#8A8A8A] px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
        <ChevronRight className="w-5 h-5 text-[#C9A962]" />
      </div>
    </button>
  )
}
