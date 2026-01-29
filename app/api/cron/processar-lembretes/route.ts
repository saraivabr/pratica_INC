/**
 * Cron: Processar Lembretes
 * 
 * Processa lembretes agendados que chegaram no horário
 * Cria notificações para os usuários
 * 
 * Executar a cada 5 minutos via cron:
 * */5 * * * * curl http://localhost:3000/api/cron/processar-lembretes
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('[Cron Lembretes] Iniciando processamento...');

    // Buscar lembretes que já passaram do horário e não foram processados
    const lembretesResult = await pool.query(
      `SELECT * FROM lembretes
       WHERE processado = false
       AND data_lembrete <= NOW()
       ORDER BY data_lembrete ASC
       LIMIT 100`
    );

    const lembretes = lembretesResult.rows;
    
    if (lembretes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum lembrete para processar',
        processados: 0,
        tempo_ms: Date.now() - startTime
      });
    }

    console.log(`[Cron Lembretes] Encontrados ${lembretes.length} lembretes para processar`);

    let processados = 0;
    let erros = 0;

    // Processar cada lembrete
    for (const lembrete of lembretes) {
      try {
        // Criar notificação
        const notifResult = await pool.query(
          `INSERT INTO notificacoes (
            tenant_id,
            workspace_id,
            user_id,
            tipo,
            titulo,
            mensagem,
            lead_id,
            prioridade,
            acao_url,
            acao_label
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id`,
          [
            lembrete.tenant_id,
            lembrete.workspace_id,
            lembrete.user_id,
            'lembrete',
            lembrete.titulo,
            lembrete.descricao || lembrete.titulo,
            lembrete.lead_id,
            'alta', // Lembretes têm prioridade alta
            lembrete.lead_id ? `/crm/leads/${lembrete.lead_id}` : null,
            lembrete.lead_id ? 'Ver Lead' : null
          ]
        );

        const notificacaoId = notifResult.rows[0]?.id;

        // Marcar lembrete como processado
        await pool.query(
          `UPDATE lembretes
           SET processado = true,
               processado_em = NOW(),
               notificacao_id = $1
           WHERE id = $2`,
          [notificacaoId, lembrete.id]
        );

        processados++;
        console.log(`[Cron Lembretes] ✅ Lembrete ${lembrete.id} processado`);

      } catch (error: any) {
        erros++;
        console.error(`[Cron Lembretes] ❌ Erro ao processar lembrete ${lembrete.id}:`, error.message);
      }
    }

    const duracao = Date.now() - startTime;

    const resultado = {
      success: true,
      total_encontrados: lembretes.length,
      processados,
      erros,
      tempo_ms: duracao
    };

    console.log('[Cron Lembretes] Resultado:', resultado);

    return NextResponse.json(resultado);

  } catch (error: any) {
    console.error('[Cron Lembretes] Erro geral:', error);
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

// POST endpoint também disponível (para chamar manualmente)
export async function POST(request: NextRequest) {
  return GET(request);
}
