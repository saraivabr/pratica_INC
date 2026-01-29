"use client"

import { useState, useMemo, useEffect } from "react"
import { Plus, Trash2, TrendingUp, Sparkles, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/data"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Unit {
  id: string
  nome: string
  metragem: number
  valorTabela: number
}

interface PaymentFlow {
  id: string
  type: 'ato' | 'mensal' | 'intermediaria' | 'chaves'
  label: string
  qtd: number
  valorUnitario: number
}

// Helper for precision math if needed, but standard JS double precision is usually okay for this scale if handled carefully
const toCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function JunctionCalculator() {
  const [activeTab, setActiveTab] = useState("dados") // dados, unidades, proposta, fluxo, resumo

  // --- 1. DADOS DO EMPREENDIMENTO ---
  const [empNome, setEmpNome] = useState("Residencial Exemplo")
  const [empComissaoPct, setEmpComissaoPct] = useState(5.0)

  // --- 2. SELEÇÃO DE UNIDADES (Manual) ---
  const [units, setUnits] = useState<Unit[]>([
    { id: "1", nome: "314", metragem: 41.62, valorTabela: 0 },
    { id: "2", nome: "315", metragem: 51.26, valorTabela: 0 }
  ])
  const [newUnitNome, setNewUnitNome] = useState("")
  const [newUnitArea, setNewUnitArea] = useState("")
  const [newUnitValor, setNewUnitValor] = useState("")

  // --- 3. PROPOSTA COMERCIAL ---
  const [vgvProposta, setVgvProposta] = useState(1200000)

  // --- 4. FLUXO DE PAGAMENTO ---
  const [flow, setFlow] = useState<PaymentFlow[]>([
    { id: "1", type: "ato", label: "Ato", qtd: 1, valorUnitario: 10000 },
    { id: "2", type: "mensal", label: "Mensais", qtd: 39, valorUnitario: 10000 },
    { id: "3", type: "intermediaria", label: "Intermediárias", qtd: 4, valorUnitario: 100000 },
    { id: "4", type: "chaves", label: "Chaves", qtd: 1, valorUnitario: 400000 },
  ])

  // --- COMPUTED VALUES ---

  // 2. Unidades
  const totalArea = useMemo(() => units.reduce((acc, u) => acc + u.metragem, 0), [units])
  
  // Calculate VGV Tabela based on manual input if needed, or override. 
  // Prompt implies VGV Tabela is an Empreendimento property, but also Unidades have values.
  // Usually VGV Tabela = Sum(Unit Table Values). Let's implement Sum if units have value, else Manual Override.
  // For this MVP, let's assume VGV Tabela is the sum of Unit Table Values if they are > 0, else user inputs it?
  // The prompt "Cadastro Simplificado" has "VGV Tabela" as a field.
  // Let's keep a state for "VGV Tabela Override" but default to sum.
  
  // Actually, let's make user input Table Value for each unit, and sum it up.
  const vgvTabelaCalculated = useMemo(() => units.reduce((acc, u) => acc + u.valorTabela, 0), [units])
  
  // However, the prompt example has VGV Tabela = 1.346.760. 
  // If user enters units without price, we can't calc.
  // Let's add a field for "VGV Tabela Total" that can be auto-calculated or manual.
  // For simplicity, let's stick to the prompt structure: Empreendimento has VGV Tabela.
  // BUT, to calculate Desconto PV, we need VGV Tabela.
  // To calculate Unit Share of VGV Tabela, we usually need unit table prices.
  // The prompt says: "Percentual de cada unidade = área individual / área total".
  // This implies the share is purely AREA based, not Table Price based.
  // So VGV Tabela is just a total number for the whole deal.
  const [vgvTabelaInput, setVgvTabelaInput] = useState(1346760) // Default from example

  // 3. Proposta Calculations
  // Desconto PV = ((VGV Proposta - VGV Tabela) / VGV Tabela) × 100
  const descontoPV = vgvTabelaInput > 0 ? ((vgvProposta - vgvTabelaInput) / vgvTabelaInput) * 100 : 0

  // Tabela sem Comissão = VGV Tabela / (1 + % comissão)
  const comissaoDecimal = empComissaoPct / 100
  const tabelaSemComissao = vgvTabelaInput / (1 + comissaoDecimal)

  // PV Final = ((VGV Proposta - Tabela sem Comissão) / Tabela sem Comissão) × 100
  const pvFinal = tabelaSemComissao > 0 ? ((vgvProposta - tabelaSemComissao) / tabelaSemComissao) * 100 : 0

  // Valor por m² = VGV Proposta / Área Total
  const valorM2 = totalArea > 0 ? vgvProposta / totalArea : 0

  // Unit Shares (Area based)
  const unitShares = useMemo(() => {
    return units.map(u => {
      const pct = totalArea > 0 ? u.metragem / totalArea : 0
      return {
        ...u,
        percentual: pct,
        valorProposta: vgvProposta * pct
      }
    })
  }, [units, totalArea, vgvProposta])

  // 4. Flow Calculations
  const flowSummary = useMemo(() => {
    let totalGeral = 0
    const rows = flow.map(item => {
      const totalItem = item.qtd * item.valorUnitario
      totalGeral += totalItem
      
      // Split by unit shares
      const shares = unitShares.map(u => ({
        unitId: u.id,
        val: totalItem * u.percentual
      }))

      return {
        ...item,
        totalItem,
        shares
      }
    })
    return { rows, totalGeral }
  }, [flow, unitShares])

  const flowDiff = vgvProposta - flowSummary.totalGeral
  const isFlowValid = Math.abs(flowDiff) < 0.01

  // --- HANDLERS ---

  const handleAddUnit = () => {
    if (!newUnitNome || !newUnitArea) {
      toast.error("Preencha nome e área da unidade")
      return
    }
    const area = parseFloat(newUnitArea.replace(",", "."))
    const val = parseFloat(newUnitValor.replace(",", ".")) || 0
    
    if (isNaN(area) || area <= 0) {
      toast.error("Área inválida")
      return
    }

    const newUnit: Unit = {
      id: Math.random().toString(36).substring(7),
      nome: newUnitNome,
      metragem: area,
      valorTabela: val
    }

    setUnits([...units, newUnit])
    setNewUnitNome("")
    setNewUnitArea("")
    setNewUnitValor("")
    toast.success("Unidade adicionada")
  }

  const handleRemoveUnit = (id: string) => {
    setUnits(units.filter(u => u.id !== id))
  }

  const handleAddFlowItem = () => {
    const newItem: PaymentFlow = {
      id: Math.random().toString(36).substring(7),
      type: 'mensal',
      label: 'Nova Parcela',
      qtd: 1,
      valorUnitario: 0
    }
    setFlow([...flow, newItem])
  }

  const handleUpdateFlow = (id: string, field: keyof PaymentFlow, val: any) => {
    setFlow(flow.map(f => f.id === id ? { ...f, [field]: val } : f))
  }

  const handleRemoveFlow = (id: string) => {
    setFlow(flow.filter(f => f.id !== id))
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header / Wizard Nav could be here */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Calculadora de Junção (MVP)</h1>
        <p className="text-muted-foreground">Sistema de cálculo de propostas para unidades conjugadas</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="dados" className="py-3">1. Empreendimento</TabsTrigger>
          <TabsTrigger value="unidades" className="py-3">2. Unidades</TabsTrigger>
          <TabsTrigger value="proposta" className="py-3">3. Proposta</TabsTrigger>
          <TabsTrigger value="fluxo" className="py-3">4. Pagamento</TabsTrigger>
          <TabsTrigger value="resumo" className="py-3">5. Resumo</TabsTrigger>
        </TabsList>

        {/* STEP 1: DADOS */}
        <TabsContent value="dados" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Empreendimento</CardTitle>
              <CardDescription>Configure os dados base para o cálculo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Nome do Empreendimento</Label>
                  <Input value={empNome} onChange={e => setEmpNome(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Comissão Imobiliária (%)</Label>
                  <Input 
                    type="number" 
                    value={empComissaoPct} 
                    onChange={e => setEmpComissaoPct(parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>VGV Tabela Total (R$)</Label>
                  <Input 
                    type="number" 
                    value={vgvTabelaInput} 
                    onChange={e => setVgvTabelaInput(parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Soma do valor de tabela das unidades selecionadas</p>
                </div>
              </div>
              
              <div className="flex justify-end mt-4">
                <Button onClick={() => setActiveTab("unidades")}>Próximo &rarr;</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STEP 2: UNIDADES */}
        <TabsContent value="unidades" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Seleção de Unidades</CardTitle>
              <CardDescription>Adicione as unidades que serão unificadas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Add Unit Form */}
              <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 p-4 rounded-lg border">
                <div className="flex-1 space-y-2">
                  <Label>Unidade (Nº)</Label>
                  <Input value={newUnitNome} onChange={e => setNewUnitNome(e.target.value)} placeholder="Ex: 314" />
                </div>
                <div className="w-full md:w-32 space-y-2">
                  <Label>Área (m²)</Label>
                  <Input type="number" value={newUnitArea} onChange={e => setNewUnitArea(e.target.value)} placeholder="0.00" />
                </div>
                {/* Optional Valor Tabela Individual field if wanted, but relying on global VGV Tabela for now as per logic, 
                    though displaying individual table values would be nice. Keeping simplified to match Prompt logic 
                    which calculates percentages based on AREA. */}
                <Button onClick={handleAddUnit}><Plus className="mr-2 h-4 w-4" /> Adicionar</Button>
              </div>

              {/* Units List */}
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unidade</TableHead>
                      <TableHead className="text-right">Área (m²)</TableHead>
                      <TableHead className="text-right">Participação</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unitShares.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.nome}</TableCell>
                        <TableCell className="text-right">{u.metragem.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{(u.percentual * 100).toFixed(2)}%</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveUnit(u.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {units.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Nenhuma unidade adicionada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-slate-100 font-bold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right">{totalArea.toFixed(2)} m²</TableCell>
                      <TableCell className="text-right">100%</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

              <div className="flex justify-between mt-4">
                <Button variant="outline" onClick={() => setActiveTab("dados")}>&larr; Voltar</Button>
                <Button onClick={() => setActiveTab("proposta")} disabled={units.length === 0}>Próximo &rarr;</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STEP 3: PROPOSTA */}
        <TabsContent value="proposta" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Calculadora de Proposta Comercial</CardTitle>
              <CardDescription>Defina o valor da proposta e visualize os indicadores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-base">VGV Tabela (Base)</Label>
                    <div className="text-2xl font-bold text-slate-600">{formatCurrency(vgvTabelaInput)}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-base text-emerald-700 font-bold">VGV Proposta (Negociado)</Label>
                    <Input 
                      type="number" 
                      value={vgvProposta} 
                      onChange={e => setVgvProposta(parseFloat(e.target.value))} 
                      className="text-xl font-bold h-12 border-emerald-500 bg-emerald-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-100 rounded-lg">
                    <Label className="text-xs text-slate-500 uppercase">Desconto PV</Label>
                    <div className={cn("text-2xl font-bold", descontoPV < 0 ? "text-green-600" : "text-red-600")}>
                      {descontoPV.toFixed(2)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Sobre Tabela Cheia</p>
                  </div>

                  <div className="p-4 bg-slate-100 rounded-lg">
                    <Label className="text-xs text-slate-500 uppercase">PV Final</Label>
                    <div className={cn("text-2xl font-bold", pvFinal < 0 ? "text-green-600" : "text-red-600")}>
                      {pvFinal.toFixed(2)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Sobre Tabela Líquida ({formatCurrency(tabelaSemComissao)})</p>
                  </div>

                  <div className="p-4 bg-slate-100 rounded-lg col-span-2">
                    <Label className="text-xs text-slate-500 uppercase">Valor por m²</Label>
                    <div className="text-2xl font-bold text-slate-800">
                      {formatCurrency(valorM2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Breakdown per unit */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b font-medium text-sm">Distribuição do Valor da Proposta</div>
                <Table>
                  <TableBody>
                    {unitShares.map(u => (
                      <TableRow key={u.id}>
                        <TableCell>Unidade {u.nome}</TableCell>
                        <TableCell className="text-right text-slate-500">{(u.percentual * 100).toFixed(2)}%</TableCell>
                        <TableCell className="text-right font-bold text-emerald-700">{formatCurrency(u.valorProposta)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between mt-4">
                <Button variant="outline" onClick={() => setActiveTab("unidades")}>&larr; Voltar</Button>
                <Button onClick={() => setActiveTab("fluxo")}>Próximo &rarr;</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STEP 4: FLUXO */}
        <TabsContent value="fluxo" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurador de Fluxo de Pagamento</CardTitle>
              <CardDescription>Defina as parcelas para totalizar {formatCurrency(vgvProposta)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Validation Banner */}
              <div className={cn(
                "p-4 rounded-lg flex items-center justify-between border",
                isFlowValid ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
              )}>
                <div>
                  <p className={cn("font-bold", isFlowValid ? "text-green-800" : "text-red-800")}>
                    Total do Fluxo: {formatCurrency(flowSummary.totalGeral)}
                  </p>
                  {!isFlowValid && (
                    <p className="text-sm text-red-600 flex items-center mt-1">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Diferença de {formatCurrency(flowDiff)} para o VGV Proposta
                    </p>
                  )}
                </div>
                {isFlowValid && <Badge className="bg-green-600 hover:bg-green-700">Validado</Badge>}
              </div>

              {/* Flow Editor */}
              <div className="space-y-2">
                {flow.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center border p-3 rounded-lg bg-white">
                    <div className="col-span-3">
                      <Label className="text-xs text-muted-foreground">Tipo</Label>
                      <Input value={item.label} onChange={e => handleUpdateFlow(item.id, 'label', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Qtd</Label>
                      <Input type="number" value={item.qtd} onChange={e => handleUpdateFlow(item.id, 'qtd', parseFloat(e.target.value))} />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs text-muted-foreground">Valor Unit. (R$)</Label>
                      <Input type="number" value={item.valorUnitario} onChange={e => handleUpdateFlow(item.id, 'valorUnitario', parseFloat(e.target.value))} />
                    </div>
                    <div className="col-span-3 text-right">
                      <Label className="text-xs text-muted-foreground block">Total Linha</Label>
                      <span className="font-bold">{formatCurrency(item.qtd * item.valorUnitario)}</span>
                    </div>
                    <div className="col-span-1 text-center pt-4">
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveFlow(item.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={handleAddFlowItem} className="w-full border-dashed">
                  <Plus className="mr-2 h-4 w-4" /> Adicionar Parcela
                </Button>
              </div>

              {/* Split Preview */}
              <div className="border rounded-md bg-slate-50 p-4">
                <h4 className="text-sm font-semibold mb-3">Distribuição por Unidade (Prévia)</h4>
                <div className="space-y-2 text-sm">
                  {unitShares.map(u => (
                    <div key={u.id} className="flex justify-between border-b pb-1">
                      <span>{u.nome} ({formatCurrency(flowSummary.totalGeral * u.percentual)})</span>
                      <span className="text-muted-foreground">{(u.percentual * 100).toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between mt-4">
                <Button variant="outline" onClick={() => setActiveTab("proposta")}>&larr; Voltar</Button>
                <Button onClick={() => setActiveTab("resumo")} disabled={!isFlowValid}>Próximo &rarr;</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STEP 5: RESUMO */}
        <TabsContent value="resumo" className="space-y-4 pt-4">
          <Card className="border-emerald-100 shadow-lg">
            <CardHeader className="bg-emerald-50/50 border-b border-emerald-100">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-emerald-900">Resumo da Proposta de Junção</CardTitle>
                  <CardDescription>Empreendimento: {empNome}</CardDescription>
                </div>
                <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">
                  {units.map(u => u.nome).join(" + ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              
              {/* Informações das Unidades */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-3 border-b pb-1">Informações das Unidades</h3>
                <div className="space-y-2">
                  {unitShares.map(u => (
                    <div key={u.id} className="flex justify-between items-center text-sm">
                      <span>
                        <span className="font-bold">Unidade {u.nome}:</span> {u.metragem} m² ({(u.percentual*100).toFixed(2)}%)
                      </span>
                      <span className="font-mono">{formatCurrency(u.valorProposta)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-sm font-bold pt-2 border-t mt-2">
                    <span>Área Total: {totalArea.toFixed(2)} m²</span>
                    <span>Total: {formatCurrency(vgvProposta)}</span>
                  </div>
                </div>
              </div>

              {/* Informações Comerciais */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-3 border-b pb-1">Informações Comerciais</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="block text-muted-foreground text-xs uppercase">VGV Tabela</span>
                    <span className="font-semibold">{formatCurrency(vgvTabelaInput)}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground text-xs uppercase">VGV Proposta</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(vgvProposta)}</span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground text-xs uppercase">Desconto PV</span>
                    <span className={cn("font-semibold", descontoPV < 0 ? "text-green-600" : "text-red-600")}>
                      {descontoPV.toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="block text-muted-foreground text-xs uppercase">PV Final (Liq)</span>
                    <span className={cn("font-semibold", pvFinal < 0 ? "text-green-600" : "text-red-600")}>
                      {pvFinal.toFixed(2)}%
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-muted-foreground text-xs uppercase">Valor por m²</span>
                    <span className="font-semibold">{formatCurrency(valorM2)}</span>
                  </div>
                </div>
              </div>

              {/* Plano de Pagamento (Detailed Table) */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-3 border-b pb-1">Plano de Pagamento</h3>
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-right">Valor Unit.</TableHead>
                        <TableHead className="text-right font-bold text-slate-900">Total</TableHead>
                        {unitShares.map(u => (
                          <TableHead key={u.id} className="text-right text-xs text-muted-foreground">
                            {u.nome} ({(u.percentual * 100).toFixed(0)}%)
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flowSummary.rows.map(row => (
                        <TableRow key={row.id}>
                          <TableCell>{row.label}</TableCell>
                          <TableCell className="text-center">{row.qtd}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.valorUnitario)}</TableCell>
                          <TableCell className="text-right font-bold bg-slate-50">{formatCurrency(row.totalItem)}</TableCell>
                          {row.shares.map(share => (
                            <TableCell key={share.unitId} className="text-right text-xs text-slate-600">
                              {formatCurrency(share.val)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-slate-100 font-bold">
                        <TableCell colSpan={3}>TOTAL</TableCell>
                        <TableCell className="text-right">{formatCurrency(flowSummary.totalGeral)}</TableCell>
                        {unitShares.map(u => (
                          <TableCell key={u.id} className="text-right text-xs">
                            {formatCurrency(flowSummary.totalGeral * u.percentual)}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => {
                  const text = `Proposta Junção: ${units.map(u => u.nome).join('+')}\nValor: ${formatCurrency(vgvProposta)}`;
                  navigator.clipboard.writeText(text);
                  toast.success("Resumo copiado!");
                }}>
                  Copiar Resumo
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Sparkles className="mr-2 h-4 w-4" /> Finalizar Proposta
                </Button>
              </div>

            </CardContent>
          </Card>
          <div className="flex justify-start mt-4">
             <Button variant="ghost" onClick={() => setActiveTab("fluxo")}>&larr; Voltar para Fluxo</Button>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  )
}
