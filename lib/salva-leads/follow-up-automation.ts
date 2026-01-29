/**
 * Automação de Follow-up
 * 
 * Envia mensagens automáticas de follow-up baseado em tempo e interações
 */

import pool from '@/lib/db';
import { sendTextMessage } from '@/lib/zapi';

export interface FollowUpConfig {
  leadId: string;
  telefone: string;
  nome: string;
  tempoDecorrido: number; // ms desde última interação
  tentativasFollowUp: number;
}

/**
 * Templatesmensagens de follow-up
 */
const TEMPLATES_FOLLOWUP = {
  primeira_mensagem: (nome: string, imovel: string) => `
Oi ${nome}! 👋

Tudo certo? Você ainda está interessado no ${imovel}?

Me manda uma mensagem que a gente conversa sobre os próximos passos! 💬
  `.trim(),

  segunda_mensagem: (nome: string) => `
${nome}, só um lembrema! ⏰

Ainda estamos aqui pra te ajudar na busca do imóvel dos seus sonhos! 🏡

Quer agendar uma visita?
  `.trim(),

  terceira_mensagem: (nome: string) => `
Oi ${nome}! 👋

Vi que você não respondeu ainda... 

Temos algumas opções incríveis que achamos que você vai adorar! 🚀

Quer que eu te mande algumas fotos? 📸
  `.trim(),

  reengajamento: (nome: string) => `
${nome}! 🎯

Achamos um imóvel PERFEITO baseado no que você procurava!

Vem conferir? Tenho certeza que você vai gostar! ✨

Quando você quer agendar uma visita?
  `.trim(),
};

/**
 * Define o tempo de delay para cada follow-up (em ms)
 */
const FOLLOW_UP_DELAYS = {
  primeira: 4 * 60 * 60 * 1000, // 4 horas
  segunda: 24 * 60 * 60 * 1000, // 24 horas
  terceira: 3 * 24 * 60 * 60 * 1000, // 3 dias
  reengajamento: 7 * 24 * 60 * 60 * 1000, // 7 dias
};

/**
 * Verifica se lead precisa de follow-up
 */
export async function verificarFollowUpNecessario(
  leadId: string,
  workspaceId: number
): Promise<{ precisa: boolean; tipo: string } | null> {
  try {
    // Buscar lead e última interação
    const leadResult = await pool.query(
      `SELECT l.*, 
        (SELECT MAX(created_at) FROM leads_interactions WHERE lead_id = l.id) as ultima_interacao,
        (SELECT COUNT(*) FROM leads_interactions WHERE lead_id = l.id AND tipo = 'follow_up_enviado') as total_followups
      FROM leads l
      WHERE l.id = $1 AND l.workspace_id = $2`,
      [leadId, workspaceId]
    );

    if (!leadResult.rows[0]) {
      return null;
    }

    const lead = leadResult.rows[0];
    const ultimaInteracao = lead.ultima_interacao ? new Date(lead.ultima_interacao) : new Date(lead.created_at);
    const agora = new Date();
    const tempoDecorrido = agora.getTime() - ultimaInteracao.getTime();
    const totalFollowups = parseInt(lead.total_followups || 0);

    // Definir qual follow-up enviar
    if (totalFollowups === 0 && tempoDecorrido >= FOLLOW_UP_DELAYS.primeira) {
      return { precisa: true, tipo: 'primeira_mensagem' };
    }

    if (totalFollowups === 1 && tempoDecorrido >= FOLLOW_UP_DELAYS.segunda) {
      return { precisa: true, tipo: 'segunda_mensagem' };
    }

    if (totalFollowups === 2 && tempoDecorrido >= FOLLOW_UP_DELAYS.terceira) {
      return { precisa: true, tipo: 'terceira_mensagem' };
    }

    if (totalFollowups === 3 && tempoDecorrido >= FOLLOW_UP_DELAYS.reengajamento) {
      return { precisa: true, tipo: 'reengajamento' };
    }

    return { precisa: false, tipo: '' };

  } catch (error) {
    console.error('[Follow-up] Erro ao verificar follow-up:', error);
    return null;
  }
}

/**
 * Envia follow-up automático
 */
export async function enviarFollowUpAutomatico(
  leadId: string,
  workspaceId: number,
  tipoFollowUp: string
): Promise<boolean> {
  try {
    // Buscar dados do lead
    const leadResult = await pool.query(
      `SELECT * FROM leads WHERE id = $1 AND workspace_id = $2`,
      [leadId, workspaceId]
    );

    if (!leadResult.rows[0]) {
      return false;
    }

    const lead = leadResult.rows[0];

    // Gerar mensagem
    let mensagem = '';
    const templates = TEMPLATES_FOLLOWUP as any;

    if (tipoFollowUp === 'primeira_mensagem') {
      mensagem = templates.primeira_mensagem(lead.nome, lead.imovel_nome || 'imóvel');
    } else if (tipoFollowUp === 'segunda_mensagem') {
      mensagem = templates.segunda_mensagem(lead.nome);
    } else if (tipoFollowUp === 'terceira_mensagem') {
      mensagem = templates.terceira_mensagem(lead.nome);
    } else if (tipoFollowUp === 'reengajamento') {
      mensagem = templates.reengajamento(lead.nome);
    }

    if (!mensagem) {
      return false;
    }

    // Enviar mensagem
    await sendTextMessage(lead.whatsapp, mensagem);

    // Registrar follow-up
    await pool.query(
      `INSERT INTO leads_interactions (
        lead_id,
        workspace_id,
        tipo,
        descricao,
        created_at
      ) VALUES ($1, $2, $3, $4, NOW())`,
      [leadId, workspaceId, 'follow_up_enviado', tipoFollowUp]
    );

    console.log('[Follow-up] Enviado com sucesso:', leadId, tipoFollowUp);
    return true;

  } catch (error: any) {
    console.error('[Follow-up] Erro ao enviar:', error.message);
    return false;
  }
}

/**
 * Executa follow-ups em batch (chamado por cron job)
 */
export async function executarFollowUpsBatch(workspaceId: number): Promise<{
  processados: number;
  enviados: number;
  erros: number;
}> {
  let processados = 0;
  let enviados = 0;
  let erros = 0;

  try {
    // Buscar todos os leads que precisam de follow-up
    const leadsResult = await pool.query(
      `SELECT id FROM leads 
       WHERE workspace_id = $1 
       AND status NOT IN ('visitou', 'fechado', 'descartado')
       AND created_at < NOW() - INTERVAL '4 hours'
       LIMIT 50`,
      [workspaceId]
    );

    for (const { id: leadId } of leadsResult.rows) {
      processados++;

      try {
        const verificacao = await verificarFollowUpNecessario(leadId, workspaceId);

        if (verificacao && verificacao.precisa) {
          const sucesso = await enviarFollowUpAutomatico(leadId, workspaceId, verificacao.tipo);
          if (sucesso) {
            enviados++;
          } else {
            erros++;
          }
        }
      } catch (err) {
        console.error('[Follow-up Batch] Erro ao processar lead:', leadId, err);
        erros++;
      }
    }

    console.log('[Follow-up Batch] Resultado:', { processados, enviados, erros });
    return { processados, enviados, erros };

  } catch (error: any) {
    console.error('[Follow-up Batch] Erro geral:', error.message);
    return { processados, enviados, erros };
  }
}
