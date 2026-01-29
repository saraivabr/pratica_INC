"use client"

import { useState } from "react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ShieldCheck, Search, FileText, AlertCircle, History, User, Calendar, Hash } from "lucide-react"
import { ScoreDisplay } from "@/components/lead/ScoreDisplay"
import { InfoCard } from "@/components/lead/InfoCard"
import useScore from "@/lib/hooks/useScore"
import { formatCPF } from "@/utils/leadUtils"
import { toast } from "sonner"

export default function ScorePage() {
  const [cpf, setCpf] = useState("")
  const { score, loading, error, consultarScore, limparScore } = useScore()
  const [lastConsultedCpf, setLastConsultedCpf] = useState("")

  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const cleanCpf = cpf.replace(/\D/g, "")
    if (cleanCpf.length !== 11) {
      toast.error("CPF deve ter 11 dígitos")
      return
    }

    try {
      await consultarScore(cleanCpf)
      setLastConsultedCpf(cpf)
    } catch (err) {
      // Error handled by useScore
    }
  }

  return (
    <AppShell title="Consulta de Score">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Consulta de Score</h1>
          <p className="text-muted-foreground">
            Consulte o score de crédito de qualquer CPF diretamente nas bases do Serasa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Form Side */}
          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" />
                  Nova Consulta
                </CardTitle>
                <CardDescription>
                  Insira o CPF para realizar a análise.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleConsultar} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="cpf"
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 11)
                          setCpf(val)
                        }}
                        className="pl-10 font-mono"
                        disabled={loading}
                      />
                    </div>
                    {cpf.length > 0 && cpf.length < 11 && (
                      <p className="text-[10px] text-amber-600 font-medium">Digite 11 números</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full gap-2" 
                    disabled={loading || cpf.replace(/\D/g, "").length !== 11}
                  >
                    {loading ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    Consultar Serasa
                  </Button>

                  {score && (
                    <Button 
                      variant="outline" 
                      className="w-full text-xs" 
                      onClick={() => {
                        limparScore()
                        setCpf("")
                      }}
                      type="button"
                    >
                      Limpar Resultado
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  Consultas Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground text-center py-4 italic">
                  Nenhuma consulta realizada nesta sessão.
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Result Side */}
          <div className="md:col-span-2">
            {!score && !loading && !error && (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-12 text-center bg-muted/20">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <ShieldCheck className="h-8 w-8 text-primary/40" />
                </div>
                <h3 className="text-lg font-semibold text-muted-foreground">Aguardando consulta</h3>
                <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto mt-2">
                  Os detalhes do score aparecerão aqui após você realizar a consulta pelo CPF.
                </p>
              </div>
            )}

            {loading && (
              <Card className="h-full flex items-center justify-center p-12">
                <ScoreDisplay score={0} loading={true} />
              </Card>
            )}

            {error && (
              <Card className="h-full border-destructive/50 bg-destructive/5">
                <CardContent className="flex flex-col items-center justify-center h-full p-12 text-center">
                  <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                  <h3 className="text-lg font-bold text-destructive">Erro na Consulta</h3>
                  <p className="text-muted-foreground mt-2 max-w-sm">{error}</p>
                  <Button 
                    variant="outline" 
                    className="mt-6" 
                    onClick={() => handleConsultar(new Event('submit') as any)}
                  >
                    Tentar Novamente
                  </Button>
                </CardContent>
              </Card>
            )}

            {score && !loading && (
              <Card className="overflow-hidden border-2 border-primary/10">
                <div className="bg-primary/5 border-b border-primary/10 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold">
                      {score.nome ? score.nome.substring(0, 1) : lastConsultedCpf.slice(0, 1)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-primary uppercase tracking-widest">Resultado da Análise</p>
                      <p className="text-sm font-mono font-medium">{formatCPF(lastConsultedCpf)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Data/Hora</p>
                    <p className="text-xs font-medium">{new Date().toLocaleString('pt-BR')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 px-6 pt-6">
                  {score.nome && (
                    <InfoCard 
                      icon={User}
                      label="Nome Completo"
                      value={score.nome}
                      className="col-span-2"
                      variant="filled"
                    />
                  )}
                  {score.dataNascimento && (
                    <InfoCard 
                      icon={Calendar}
                      label="Data de Nascimento"
                      value={score.dataNascimento}
                      variant="filled"
                    />
                  )}
                  {score.protocolo && (
                    <InfoCard
                      icon={Hash}
                      label="Protocolo"
                      value={score.protocolo}
                      variant="filled"
                    />
                  )}
                </div>

                <CardContent className="p-0">
                  <ScoreDisplay 
                    score={score.score} 
                    faixa={score.risco} 
                    probabilidade={score.probabilidade} 
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
