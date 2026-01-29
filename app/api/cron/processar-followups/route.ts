/**
 * Cron: Processar Follow-ups Automáticos
 * 
 * Verifica leads que precisam de follow-up baseado nas automações configuradas
 * Envia mensagens automáticas via WhatsApp
 * 
 * Executar a cada hora via cron:
 * 0 * * * * curl http://localhost:3000/api/cron/processar-followups
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendTextMessage } from '@/lib/zapi';

interface Automacao {
  id: number;
  nome: string;
  trigger_tipo: string;
  trigger_config: any;
  template_mensagem: string;
  workspace_id: number;
  tenant_id: number;
}

function substituirVariaveis(
  template: string,
  lead: any,
  corretor: any = {}
): string {
  return template
    .replace(/{nome}/g, lead.nome || lead.name || 'Cliente')
    .replace(/{corretor_nome}/g, corretor.nome || 'nossa equipe')
    .replace(/{empreendimento}/g, lead.empreendimento_nome || 'nosso empreendimento')
    .replace(/{imovel}/g, lead.empreendimento_nome || lead.imovel_nome || 'o imóvel');
}

async function processarAutomacao(automacao: Automacao): Promise<{
  processados: number;
  enviados: number;
  erros: number;
}> {
  let processados = 0;
  let enviados = 0;
  let erros = 0;

  try {
    let query = '';
    let params: any[] = [automacao.workspace_id];

    switch (automacao.trigger_tipo) {
      case 'novo_lead':
        // Leads criados recentemente sem follow-up enviado
        query = `
          SELECT DISTINCT l.*
          FROM leads l
          LEFT JOIN automacoes_execucoes ae ON ae.lead_id = l.id AND ae.automacao_id = $2
          WHERE l.workspace_id = $1
          AND ae.id IS NULL
          AND l.phone IS NOT NULL
          AND l.created_at > NOW() - INTERVAL '24 hours'
          LIMIT 20
        `;
        params.push(automacao.id);
        break;

      case 'dias_sem_resposta':
        const dias = automacao.trigger_config?.dias || 3;
        query = `
          SELECT DISTINCT l.*
          FROM leads l
          LEFT JOIN automacoes_execucoes ae ON ae.lead_id = l.id AND ae.automacao_id = $2
          WHERE l.workspace_id = $1
          AND ae.id IS NULL
          AND l.phone IS NOT NULL
          AND l.last_interaction_at < NOW() - INTERVAL '1 day' * $3
          AND l.last_interaction_at > NOW() - INTERVAL '1 day' * ($3 + 1)
          LIMIT 20
        `;
        params.push(automacao.id, dias);
        break;

      case 'lead_frio':
        const diasFrio = automacao.trigger_config?.dias || 7;
        query = `
          SELECT DISTINCT l.*
          FROM leads l
          LEFT JOIN automacoes_execucoes ae ON ae.lead_id = l.id AND ae.automacao_id = $2
          WHERE l.workspace_id = $1
          AND ae.id IS NULL
          AND l.phone IS NOT NULL
          AND (l.temperature = 'cold' OR l.last_interaction_at < NOW() - INTERVAL '1 day' * $3)
          AND l.created_at < NOW() - INTERVAL '1 day' * $3
          LIMIT 20
        `;
        params.push(automacao.id, diasFrio);
        break;

      default:
        console.log(`[Follow-up] Trigger tipo não suportado: ${automacao.trigger_tipo}`);
        return { processados, enviados, erros };
    }

    const leadsResult = await pool.query(query, params);
    const leads = leadsResult.rows;

    console.log(`[Follow-up] Automação "${automacao.nome}": ${leads.length} leads encontrados`);

    for (const lead of leads) {
      processados++;

      try {
        // Buscar corretor responsável (se houver user_id)
        let corretor: any = {};
        if (lead.user_id) {
          const corretorResult = await pool.query(
            'SELECT nome, telefone FROM users WHERE id = $1',
            [lead.user_id]
          );
          corretor = corretorResult.rows[0] || {};
        }

        // Gerar mensagem
        const mensagem = substituirVariaveis(
          automacao.template_mensagem,
          lead,
          corretor
        );

        // Enviar WhatsApp
        const telefone = lead.phone || lead.telefone;
        if (!telefone) {
          throw new Error('Lead sem telefone');
        }

        await sendTextMessage(telefone, mensagem);
        enviados++;

        // Registrar execução
        await pool.query(
          `INSERT INTO automacoes_execucoes (
            automacao_id,
            lead_id,
            sucesso,
            dados_enviados
          ) VALUES ($1, $2, true, $3)`,
          [
            automacao.id,
            lead.id,
            JSON.stringify({ mensagem, telefone })
          ]
        );

        // Atualizar última interação do lead
        await pool.query(
          `UPDATE leads 
           SET last_interaction_at = NOW()
           WHERE id = $1`,
          [lead.id]
        );

        console.log(`[Follow-up] ✅ Mensagem enviada para ${lead.name || lead.nome}`);

      } catch (error: any) {
        erros++;
        console.error(`[Follow-up] ❌ Erro ao processar lead ${lead.id}:`, error.message);

        // Registrar erro
        await pool.query(
          `INSERT INTO automacoes_execucoes (
            automacao_id,
            lead_id,
            sucesso,
            erro_mensagem
          ) VALUES ($1, $2, false, $3)`,
          [automacao.id, lead.id, error.message]
        );
      }

      // Delay de 2 segundos entre mensagens (evitar flood)
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Atualizar estatísticas da automação
    await pool.query(
      `UPDATE automacoes_followup
       SET total_execucoes = total_execucoes + $1,
           ultima_execucao = NOW()
       WHERE id = $2`,
      [enviados, automacao.id]
    );

  } catch (error: any) {
    console.error(`[Follow-up] Erro na automação ${automacao.nome}:`, error.message);
  }

  return { processados, enviados, erros };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('[Cron Follow-ups] Iniciando processamento...');

    // Buscar automações ativas
    const automacoesResult = await pool.query(
      `SELECT * FROM automacoes_followup
       WHERE ativo = true
       ORDER BY id ASC`
    );

    const automacoes: Automacao[] = automacoesResult.rows;

    if (automacoes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhuma automação ativa',
        tempo_ms: Date.now() - startTime
      });
    }

    console.log(`[Cron Follow-ups] ${automacoes.length} automações ativas`);

    const resultados = [];
    let totalProcessados = 0;
    let totalEnviados = 0;
    let totalErros = 0;

    // Processar cada automação
    for (const automacao of automacoes) {
      const resultado = await processarAutomacao(automacao);
      
      resultados.push({
        automacao: automacao.nome,
        ...resultado
      });

      totalProcessados += resultado.processados;
      totalEnviados += resultado.enviados;
      totalErros += resultado.erros;
    }

    const duracao = Date.now() - startTime;

    const resultado = {
      success: true,
      total_automacoes: automacoes.length,
      total_processados: totalProcessados,
      total_enviados: totalEnviados,
      total_erros: totalErros,
      resultados,
      tempo_ms: duracao
    };

    console.log('[Cron Follow-ups] Resultado:', resultado);

    return NextResponse.json(resultado);

  } catch (error: any) {
    console.error('[Cron Follow-ups] Erro geral:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        tempo_ms: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

// POST endpoint também disponível
export async function POST(request: NextRequest) {
  return GET(request);
}
