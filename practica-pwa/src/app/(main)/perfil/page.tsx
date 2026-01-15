"use client"

import { useSession, signOut } from "next-auth/react"
import {
  LogOut,
  Phone,
  Bell,
  Shield,
  HelpCircle,
  ChevronRight,
} from "lucide-react"

function PerfilSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#e8e8ed] p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#f5f5f7] animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-[#f5f5f7] rounded-lg w-32 animate-pulse" />
            <div className="h-4 bg-[#f5f5f7] rounded-lg w-24 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="h-32 bg-[#f5f5f7] rounded-2xl animate-pulse" />
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
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#f5f5f7]/80 backdrop-blur-xl border-b border-[#d2d2d7]/50">
        <div className="px-5 pt-14 pb-4">
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
            Perfil
          </h1>
          <p className="text-[13px] text-[#86868b] mt-0.5">
            Gerencie sua conta
          </p>
        </div>
      </header>

      <main className="px-5 py-5 pb-28">
        {isLoading ? (
          <PerfilSkeleton />
        ) : (
          <div className="space-y-4">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl border border-[#e8e8ed] p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1d1d1f] to-[#424245] flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl font-semibold">
                    {initials}
                  </span>
                </div>
                <div className="flex-1">
                  <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                    {session?.user?.name || "Corretor"}
                  </h2>
                  {session?.user?.whatsapp && (
                    <div className="flex items-center gap-2 text-[#86868b] mt-1">
                      <Phone className="w-3.5 h-3.5" />
                      <span className="text-[13px]">{session.user.whatsapp}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Menu Options */}
            <div className="bg-white rounded-2xl border border-[#e8e8ed] overflow-hidden shadow-sm">
              <MenuItem
                icon={Bell}
                label="Notificações"
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

            {/* Company Info */}
            <div className="bg-[#1d1d1f] rounded-2xl p-5 text-white shadow-lg">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <span className="text-xl font-semibold">P</span>
                </div>
                <div>
                  <h3 className="font-semibold text-[15px]">Prática Construtora</h3>
                  <p className="text-white/60 text-[13px]">25+ anos de experiência</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-[22px] font-semibold">3k+</p>
                  <p className="text-[11px] text-white/60">Clientes</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-[22px] font-semibold">6</p>
                  <p className="text-[11px] text-white/60">Empreendimentos</p>
                </div>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 h-[50px] bg-white border border-[#fecaca] text-[#dc2626] rounded-2xl text-[15px] font-medium hover:bg-[#fef2f2] transition-colors shadow-sm"
            >
              <LogOut className="w-5 h-5" />
              Sair da conta
            </button>

            {/* Version */}
            <p className="text-center text-[11px] text-[#86868b] pt-2">
              Prática Catálogo v1.0.0
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
      className="w-full flex items-center justify-between p-4 border-b border-[#f5f5f7] last:border-0 hover:bg-[#f5f5f7] transition-colors disabled:opacity-60"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#f5f5f7] flex items-center justify-center">
          <Icon className="w-[18px] h-[18px] text-[#86868b]" />
        </div>
        <span className="text-[15px] font-medium text-[#1d1d1f]">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="text-[11px] bg-[#f5f5f7] text-[#86868b] px-2.5 py-1 rounded-full font-medium">
            {badge}
          </span>
        )}
        <ChevronRight className="w-5 h-5 text-[#d2d2d7]" />
      </div>
    </button>
  )
}
