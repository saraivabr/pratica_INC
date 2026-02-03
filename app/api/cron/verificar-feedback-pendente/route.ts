/**
 * Cron: Verificar Feedback Pendente
 *
 * GET/POST /api/cron/verificar-feedback-pendente
 *
 * Verifica corretores com leads sem feedback há mais de 24 horas.
 * Deve ser executado a cada hora.
 *
 * Ações:
 * - Marca corretores com feedback_pendente = true (bloqueia de receber novos leads)
 * - Envia lembrete WhatsApp para o corretor
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendTextMessage, formatPhoneNumber, isInstanceConnected } from '@/lib/evolution-api';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 minuto max

interface CorretorPendente {
  user_id: string;
  user_nome: string;
  user_telefone: string | null;
  instance_name: string | null;
  workspace_id: number;
  atribuicoes_pendentes: number;
  atribuicoes_ids: string[];
}

/**
 * Valida autenticação do cron
 */
function validateCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // SECURITY: Sempre exigir CRON_SECRET
  if (!cronSecret) {
    console.error('[Cron Auth] CRON_SECRET não configurado. Rejeitando request.');
    return false;
  }

  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const xCronSecret = request.headers.get('x-cron-secret');
  if (xCronSecret === cronSecret) {
    return true;
  }

  return false;
}

/**
 * Busca corretores com feedback pendente (prazo 24h expirado)
 */
async function buscarCorretoresPendentes(): Promise<CorretorPendente[]> {
  const result = await pool.query<CorretorPendente>(`
    SELECT
      u.id AS user_id,
      u.nome AS user_nome,
      u.telefone AS user_telefone,
      u.evolution_instance_name AS instance_name,
      rp.workspace_id,
      COUNT(ra.id)::INTEGER AS atribuicoes_pendentes,
      ARRAY_AGG(ra.id) AS atribuicoes_ids
    FROM users u
    JOIN recepcao_presencas rp ON rp.user_id = u.id
    JOIN recepcao_atribuicoes ra ON ra.presenca_id = rp.id
    WHERE ra.feedback_status IS NULL
      AND ra.atribuido_at < NOW() - INTERVAL '24 hours'
      AND rp.status = 'presente'
    GROUP BY u.id, u.nome, u.telefone, u.evolution_instance_name, rp.workspace_id
  `);

  return result.rows;
}

/**
 * Marca corretor como bloqueado por feedback pendente
 */
async function marcarFeedbackPendente(userId: string): Promise<number> {
  const result = await pool.query(`
    UPDATE recepcao_presencas
    SET feedback_pendente = true, updated_at = NOW()
    WHERE user_id = $1
      AND status = 'presente'
      AND feedback_pendente = false
    RETURNING id
  `, [userId]);

  return result.rowCount || 0;
}

/**
 * Envia lembrete WhatsApp para o corretor
 */
async function enviarLembrete(
  instanceName: string,
  corretorTelefone: string,
  corretorNome: string,
  atribuicoesPendentes: number
): Promise<boolean> {
  try {
    // Verificar se instância está conectada
    const connected = await isInstanceConnected(instanceName);
    if (!connected) {
      console.log(`[Feedback Pendente] Instância ${instanceName} não conectada`);
      return false;
    }

    const mensagem = `⚠️ *Atenção, ${corretorNome.split(' ')[0]}!*

Você tem *${atribuicoesPendentes} lead(s)* aguardando feedback há mais de 24 horas.

📋 Acesse o sistema para registrar o resultado dos atendimentos.

*Importante:* Enquanto houver feedback pendente, você não receberá novos leads.

Regularize sua situação para voltar a receber oportunidades! 🚀`;

    await sendTextMessage(instanceName, {
      number: formatPhoneNumber(corretorTelefone),
      text: mensagem,
    });

    console.log(`[Feedback Pendente] Lembrete enviado para ${corretorNome}`);
    return true;
  } catch (error) {
    console.error(`[Feedback Pendente] Erro ao enviar lembrete:`, error);
    return false;
  }
}

/**
 * GET /api/cron/verificar-feedback-pendente
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Validar autenticação
  if (!validateCronAuth(request)) {
    console.error('[Feedback Pendente] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Buscar corretores com feedback pendente
    const corretores = await buscarCorretoresPendentes();

    if (corretores.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum corretor com feedback pendente',
        duration: Date.now() - startTime,
        corretores_bloqueados: 0,
        lembretes_enviados: 0,
      });
    }

    console.log(`[Feedback Pendente] ${corretores.length} corretor(es) com feedback pendente`);

    let corretoresBloqueados = 0;
    let lembretesEnviados = 0;
    const resultados: {
      user_id: string;
      nome: string;
      pendentes: number;
      bloqueado: boolean;
      lembrete_enviado: boolean;
    }[] = [];

    // Processar cada corretor
    for (const corretor of corretores) {
      const bloqueado = await marcarFeedbackPendente(corretor.user_id) > 0;
      if (bloqueado) {
        corretoresBloqueados++;
        console.log(`[Feedback Pendente] Corretor ${corretor.user_nome} bloqueado (${corretor.atribuicoes_pendentes} pendências)`);
      }

      let lembreteEnviado = false;

      // Tentar enviar lembrete WhatsApp
      if (corretor.instance_name && corretor.user_telefone) {
        lembreteEnviado = await enviarLembrete(
          corretor.instance_name,
          corretor.user_telefone,
          corretor.user_nome,
          corretor.atribuicoes_pendentes
        );

        if (lembreteEnviado) {
          lembretesEnviados++;
        }
      }

      resultados.push({
        user_id: corretor.user_id,
        nome: corretor.user_nome,
        pendentes: corretor.atribuicoes_pendentes,
        bloqueado,
        lembrete_enviado: lembreteEnviado,
      });
    }

    return NextResponse.json({
      success: true,
      duration: Date.now() - startTime,
      total_corretores: corretores.length,
      corretores_bloqueados: corretoresBloqueados,
      lembretes_enviados: lembretesEnviados,
      resultados,
    });

  } catch (error: any) {
    console.error('[Feedback Pendente] Erro geral:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Suporte a POST para testes manuais
export async function POST(request: NextRequest) {
  return GET(request);
}
