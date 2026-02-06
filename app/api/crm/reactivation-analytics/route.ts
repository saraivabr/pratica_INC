import { NextRequest, NextResponse } from "next/server"
import { requireWorkspaceContext } from "@/lib/api-helpers"
import { withTenant } from "@/lib/tenant-context"

// Valores médios estimados por empreendimento
const VALORES_EMPREENDIMENTO: Record<string, number> = {
  'ALTA FLORESTA- TATUAPÉ': 450000,
  'MOMENT CONCEIÇÃO STUDIOS': 320000,
  'STATION PARK APARTAMENTOS': 380000,
  'COLATINNA 56': 520000,
  'ESSÊNCIA DA VILA': 480000,
  'AURA': 550000,
  'MIRANTE': 420000,
  'DEFAULT': 400000
}

const TAXA_COMISSAO_TOTAL = 0.05 // 5%
const TAXA_CORRETOR = 0.40 // 40% da comissão

export async function GET(request: NextRequest) {
  try {
    // Autenticação e contexto do tenant
    const ctx = await requireWorkspaceContext(request)
    if (ctx.error) return ctx.error

    const { workspaceId } = ctx

    const date180DaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
    const date7DaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    return await withTenant(workspaceId, async (client) => {
      // 1. Buscar leads parados para reativação
      const result = await client.query(`
        SELECT *
        FROM cvcrm_leads
        WHERE workspace_id = $1
          AND telefone IS NOT NULL
          AND telefone != ''
          AND data_cad >= $2
          AND data_cad <= $3
      `, [workspaceId, date180DaysAgo, date7DaysAgo])

      const leads = result.rows || []

      // Filtrar por situação (excluir perdidos, vendidos, reservas, crédito)
      const leadsReativacao = (leads || []).filter(lead => {
        const situacao = (lead.situacao_nome || '').toLowerCase()
        return !situacao.includes('perdido') &&
               !situacao.includes('venda') &&
               !situacao.includes('vendido') &&
               !situacao.includes('reserva') &&
               !situacao.includes('crédito') &&
               !situacao.includes('credito') &&
               !situacao.includes('montagem') &&
               !situacao.includes('cancelado')
      })

      // 2. Calcular métricas
      let vgvTotal = 0
      const porEmpreendimento: Record<string, { leads: number; vgv: number; comissao: number }> = {}
      const porImobiliaria: Record<string, { leads: number; vgv: number }> = {}
      const porTemperatura = { quente: 0, morno: 0, frio: 0 }

      const leadsAnalisados = leadsReativacao.map(lead => {
        const diasCadastro = Math.floor((Date.now() - new Date(lead.data_cad).getTime()) / (24 * 60 * 60 * 1000))

        // Empreendimento
        const empreendimentos = lead.empreendimento || []
        const empNome = Array.isArray(empreendimentos) && empreendimentos.length > 0
          ? empreendimentos[0].nome
          : 'Não definido'

        const valorEstimado = VALORES_EMPREENDIMENTO[empNome] || VALORES_EMPREENDIMENTO['DEFAULT']
        const comissaoPotencial = valorEstimado * TAXA_COMISSAO_TOTAL * TAXA_CORRETOR

        vgvTotal += valorEstimado

        // Agrupar por empreendimento
        if (!porEmpreendimento[empNome]) {
          porEmpreendimento[empNome] = { leads: 0, vgv: 0, comissao: 0 }
        }
        porEmpreendimento[empNome].leads++
        porEmpreendimento[empNome].vgv += valorEstimado
        porEmpreendimento[empNome].comissao += comissaoPotencial

        // Agrupar por imobiliária
        const imobNome = lead.imobiliaria?.nome || 'Sem Imobiliária'
        if (!porImobiliaria[imobNome]) {
          porImobiliaria[imobNome] = { leads: 0, vgv: 0 }
        }
        porImobiliaria[imobNome].leads++
        porImobiliaria[imobNome].vgv += valorEstimado

        // Score e temperatura
        const situacaoNome = (lead.situacao_nome || '').toLowerCase()
        let score = 50

        // Recência
        if (diasCadastro <= 14) score += 25
        else if (diasCadastro <= 30) score += 15
        else if (diasCadastro <= 60) score += 5
        else score -= 10

        // Situação
        if (situacaoNome.includes('visita')) score += 30
        else if (situacaoNome.includes('aguardando')) score += 15
        else if (situacaoNome.includes('atendimento')) score += 10

        // Empreendimento definido
        if (empNome !== 'Não definido') score += 15

        // Email
        if (lead.email) score += 5

        // Temperatura
        let temperatura: 'quente' | 'morno' | 'frio'
        if (score >= 70 || situacaoNome.includes('visita')) {
          temperatura = 'quente'
          porTemperatura.quente++
        } else if (score >= 50 || diasCadastro <= 30) {
          temperatura = 'morno'
          porTemperatura.morno++
        } else {
          temperatura = 'frio'
          porTemperatura.frio++
        }

        return {
          id: lead.id,
          idlead: lead.id_lead,
          nome: lead.nome || 'Sem nome',
          telefone: lead.telefone,
          email: lead.email,
          situacao: lead.situacao_nome || 'Não definida',
          empreendimento: empNome,
          diasCadastro,
          valorEstimado,
          comissaoPotencial,
          score,
          temperatura,
          corretor: lead.corretor?.nome || null,
          imobiliaria: imobNome,
          origem: lead.origem,
          linkCvcrm: `https://pratica.cvcrm.com.br/gestor/comercial/leads/${lead.id_lead}/administrar`
        }
      })

      // Ordenar por score
      leadsAnalisados.sort((a, b) => b.score - a.score)

      // 3. Calcular cenários de conversão
      const comissaoTotal = vgvTotal * TAXA_COMISSAO_TOTAL
      const suaParteTotal = comissaoTotal * TAXA_CORRETOR

      const cenarios = [
        { nome: 'Pessimista', taxa: 0.02, vendas: Math.round(leadsAnalisados.length * 0.02), comissao: vgvTotal * 0.02 * TAXA_COMISSAO_TOTAL * TAXA_CORRETOR },
        { nome: 'Conservador', taxa: 0.05, vendas: Math.round(leadsAnalisados.length * 0.05), comissao: vgvTotal * 0.05 * TAXA_COMISSAO_TOTAL * TAXA_CORRETOR },
        { nome: 'Realista', taxa: 0.10, vendas: Math.round(leadsAnalisados.length * 0.10), comissao: vgvTotal * 0.10 * TAXA_COMISSAO_TOTAL * TAXA_CORRETOR },
        { nome: 'Otimista', taxa: 0.15, vendas: Math.round(leadsAnalisados.length * 0.15), comissao: vgvTotal * 0.15 * TAXA_COMISSAO_TOTAL * TAXA_CORRETOR },
      ]

      // 4. Formatar dados de empreendimento para o gráfico
      const empreendimentosData = Object.entries(porEmpreendimento)
        .map(([nome, data]) => ({
          nome: nome.length > 20 ? nome.substring(0, 20) + '...' : nome,
          nomeCompleto: nome,
          leads: data.leads,
          vgv: data.vgv,
          comissao: data.comissao
        }))
        .sort((a, b) => b.vgv - a.vgv)
        .slice(0, 10)

      // 5. Formatar dados de imobiliária
      const imobiliariasData = Object.entries(porImobiliaria)
        .map(([nome, data]) => ({
          nome,
          leads: data.leads,
          vgv: data.vgv
        }))
        .sort((a, b) => b.leads - a.leads)

      // 6. Top leads para contato
      const topLeads = leadsAnalisados.slice(0, 30)

      // 7. Leads com visita (prioridade máxima)
      const leadsComVisita = leadsAnalisados.filter(l =>
        l.situacao.toLowerCase().includes('visita')
      )

      // 8. Leads sem corretor (oportunidade direta)
      const leadsSemCorretor = leadsAnalisados.filter(l => !l.corretor)

      return NextResponse.json({
        resumo: {
          totalLeads: leadsAnalisados.length,
          vgvTotal,
          comissaoTotal,
          suaParte: suaParteTotal,
          valorMedioLead: leadsAnalisados.length > 0 ? vgvTotal / leadsAnalisados.length : 0,
          comissaoMediaLead: leadsAnalisados.length > 0 ? suaParteTotal / leadsAnalisados.length : 0,
        },
        temperaturas: porTemperatura,
        cenarios,
        empreendimentos: empreendimentosData,
        imobiliarias: imobiliariasData,
        topLeads,
        leadsComVisita,
        leadsSemCorretor: leadsSemCorretor.slice(0, 20),
        ultimaAtualizacao: new Date().toISOString()
      })
    })
  } catch (error) {
    console.error('Erro ao buscar analytics de reativação:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados' },
      { status: 500 }
    )
  }
}
