/**
 * API: Disparador Inteligente
 *
 * GET /api/disparador - Lista disparos do corretor
 * POST /api/disparador - Cria novo disparo
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';
import { isInstanceConnected } from '@/lib/evolution-api';
import OpenAI from 'openai';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000,
});

const LeadImportadoSchema = z.object({
  nome: z.string().min(1),
  telefone: z.string().min(8),
  empreendimento: z.string().optional().default(''),
});

const CreateDisparoSchema = z.object({
  tipo: z.enum(['follow_up', 'novidade', 'convite', 'livre']),
  intencao: z.string().min(5, 'Descreva sua intenção'),
  filtros: z.object({
    situacao: z.string().optional(),
    empreendimento: z.string().optional(),
    dias_sem_contato: z.number().optional(),
  }).optional().default({}),
  leads_importados: z.array(LeadImportadoSchema).max(50).optional(),
});

const TIPO_PROMPTS: Record<string, string> = {
  follow_up: `Você é um corretor imobiliário fazendo follow-up com um lead que demonstrou interesse. Tom: cordial, não invasivo, relembrando o interesse anterior.`,
  novidade: `Você é um corretor imobiliário compartilhando uma novidade ou oportunidade. Tom: entusiasmado mas profissional.`,
  convite: `Você é um corretor imobiliário convidando um lead para um evento ou visita. Tom: pessoal, exclusivo.`,
  livre: `Você é um corretor imobiliário enviando uma mensagem personalizada. Tom: adaptado ao contexto.`,
};

/**
 * Verifica se está em horário comercial (8h-20h BRT)
 */
function isHorarioComercial(): boolean {
  const now = new Date();
  const brt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const hour = brt.getHours();
  return hour >= 8 && hour < 20;
}

/**
 * GET /api/disparador
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;

    const result = await pool.query(
      `SELECT
        d.*,
        (SELECT COUNT(*) FROM disparo_leads dl WHERE dl.disparo_id = d.id AND dl.status = 'enviado') as enviados_real
      FROM disparos d
      WHERE d.workspace_id = $1 AND d.user_id = $2
      ORDER BY d.created_at DESC
      LIMIT 20`,
      [workspaceId, (user as any).id]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('[Disparador GET] Erro:', error);
    return NextResponse.json({ error: 'Erro ao listar disparos' }, { status: 500 });
  }
}

/**
 * POST /api/disparador
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;
    const userId = (user as any).id;
    const corretorId = (user as any).cvcrm_id;

    // Validar body
    const body = await request.json();
    const validation = CreateDisparoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { tipo, intencao, filtros, leads_importados } = validation.data;
    const isImport = leads_importados && leads_importados.length > 0;

    if (!isImport && !corretorId) {
      return NextResponse.json(
        { error: 'Corretor não vinculado ao CV CRM. Use a importação manual.' },
        { status: 400 }
      );
    }

    // Verificar instância WhatsApp
    const userResult = await pool.query(
      `SELECT evolution_instance_name, evolution_connected FROM users WHERE id = $1`,
      [userId]
    );
    const userData = userResult.rows[0];

    if (!userData?.evolution_instance_name) {
      return NextResponse.json(
        { error: 'WhatsApp não configurado. Conecte seu WhatsApp primeiro.' },
        { status: 400 }
      );
    }

    if (!userData.evolution_connected) {
      return NextResponse.json(
        { error: 'WhatsApp desconectado. Reconecte antes de disparar.' },
        { status: 400 }
      );
    }

    // Verificar conexão real
    const connected = await isInstanceConnected(userData.evolution_instance_name);
    if (!connected) {
      return NextResponse.json(
        { error: 'WhatsApp desconectado. Verifique a conexão.' },
        { status: 400 }
      );
    }

    // Verificar horário comercial
    if (!isHorarioComercial()) {
      return NextResponse.json(
        { error: 'Disparos só podem ser feitos entre 8h e 20h (horário de Brasília).' },
        { status: 400 }
      );
    }

    // Verificar se já tem disparo ativo
    const activeResult = await pool.query(
      `SELECT id FROM disparos WHERE user_id = $1 AND status = 'enviando' LIMIT 1`,
      [userId]
    );
    if (activeResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Você já tem um disparo em andamento. Aguarde finalizar.' },
        { status: 400 }
      );
    }

    // Montar lista de leads (CRM ou importados)
    let leads: Array<{ idlead: number | null; nome: string; telefone: string; empreendimento: string }> = [];

    if (isImport) {
      // Leads importados manualmente
      leads = leads_importados!.map((l, i) => ({
        idlead: null,
        nome: l.nome.trim(),
        telefone: l.telefone.replace(/\D/g, ''),
        empreendimento: l.empreendimento || '',
      })).filter(l => l.telefone.length >= 8);
    } else {
      // Buscar do CRM
      const conditions: string[] = [
        'l.workspace_id = $1',
        'l.corretor_id = $2',
        "l.telefones IS NOT NULL AND l.telefones != '[]'::jsonb AND l.telefones != 'null'",
        `NOT EXISTS (
          SELECT 1 FROM disparo_leads dl
          JOIN disparos d ON d.id = dl.disparo_id
          WHERE dl.lead_cvcrm_id = l.idlead
            AND dl.status = 'enviado'
            AND dl.enviado_at > NOW() - INTERVAL '48 hours'
        )`,
      ];
      const params: any[] = [workspaceId, corretorId];
      let paramIndex = 3;

      if (filtros.situacao) {
        conditions.push(`l.situacao = $${paramIndex}`);
        params.push(filtros.situacao);
        paramIndex++;
      }

      if (filtros.empreendimento) {
        conditions.push(`l.empreendimentos::text ILIKE $${paramIndex}`);
        params.push(`%${filtros.empreendimento}%`);
        paramIndex++;
      }

      if (filtros.dias_sem_contato && filtros.dias_sem_contato > 0) {
        conditions.push(`
          NOT EXISTS (
            SELECT 1 FROM cvcrm_lead_interacoes i
            WHERE i.idlead = l.idlead
              AND i.workspace_id = l.workspace_id
              AND i.created_at > NOW() - INTERVAL '${filtros.dias_sem_contato} days'
          )
        `);
      }

      const leadsResult = await pool.query(
        `SELECT l.id, l.idlead, l.nome, l.telefones, l.empreendimentos
         FROM cvcrm_leads l
         WHERE ${conditions.join(' AND ')}
         ORDER BY l.created_at DESC
         LIMIT 50`,
        params
      );

      leads = leadsResult.rows.map((lead: any) => {
        let telefone = '';
        try {
          const telefones = typeof lead.telefones === 'string'
            ? JSON.parse(lead.telefones) : lead.telefones;
          if (Array.isArray(telefones) && telefones.length > 0) {
            telefone = telefones[0]?.ddd && telefones[0]?.telefone
              ? `${telefones[0].ddd}${telefones[0].telefone}`
              : typeof telefones[0] === 'string' ? telefones[0] : '';
          }
        } catch { /* ignore */ }

        let empreendimentoNome = '';
        try {
          const emps = typeof lead.empreendimentos === 'string'
            ? JSON.parse(lead.empreendimentos) : lead.empreendimentos;
          if (Array.isArray(emps) && emps.length > 0) {
            empreendimentoNome = emps[0]?.nome || emps[0] || '';
          }
        } catch { /* ignore */ }

        return {
          idlead: lead.idlead as number,
          nome: lead.nome,
          telefone,
          empreendimento: empreendimentoNome,
        };
      }).filter((l: any) => l.telefone);
    }

    if (leads.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum lead encontrado com os filtros selecionados.' },
        { status: 400 }
      );
    }

    // Gerar mensagens com IA (em paralelo, grupos de 5)
    const mensagensMap: Map<number, string> = new Map();

    const gerarMensagem = async (lead: any): Promise<string> => {
      if (!process.env.OPENAI_API_KEY) {
        return `Olá, ${lead.nome.split(' ')[0]}! ${intencao}`;
      }

      try {
        const prompt = `Gere UMA mensagem de WhatsApp para:
Nome: ${lead.nome}
${lead.empreendimento ? `Interesse: ${lead.empreendimento}` : ''}

INTENÇÃO: ${intencao}

REGRAS:
- Comece saudando pelo primeiro nome (${lead.nome.split(' ')[0]})
- Max 400 caracteres
- Formatação WhatsApp: *negrito*
- Emojis moderados
- Tom natural, como mensagem digitada manualmente
- NUNCA mencione automação

Responda APENAS com a mensagem, sem explicações.`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: TIPO_PROMPTS[tipo] },
            { role: 'user', content: prompt },
          ],
          temperature: 0.85,
          max_tokens: 250,
        });

        return completion.choices[0]?.message?.content?.trim() ||
          `Olá, ${lead.nome.split(' ')[0]}! ${intencao}`;
      } catch {
        return `Olá, ${lead.nome.split(' ')[0]}! ${intencao}`;
      }
    };

    // Process in batches of 5
    for (let i = 0; i < leads.length; i += 5) {
      const batch = leads.slice(i, i + 5);
      const results = await Promise.all(batch.map(gerarMensagem));
      batch.forEach((lead: any, idx: number) => {
        mensagensMap.set(i + idx, results[idx]);
      });
    }

    // Insert disparo
    const disparoResult = await pool.query(
      `INSERT INTO disparos (workspace_id, user_id, corretor_cvcrm_id, tipo, intencao, filtros, instance_name, total_leads, status, started_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'enviando', NOW())
       RETURNING id`,
      [
        workspaceId,
        userId,
        corretorId || null,
        tipo,
        intencao,
        JSON.stringify(isImport ? { importado: true, total: leads.length } : filtros),
        userData.evolution_instance_name,
        leads.length,
      ]
    );

    const disparoId = disparoResult.rows[0].id;

    // Insert disparo_leads
    const insertValues: string[] = [];
    const insertParams: any[] = [];
    let pIdx = 1;

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      insertValues.push(
        `($${pIdx}, $${pIdx + 1}, $${pIdx + 2}, $${pIdx + 3}, $${pIdx + 4}, $${pIdx + 5}, $${pIdx + 6})`
      );
      insertParams.push(
        disparoId,
        lead.idlead || null,
        lead.nome,
        lead.telefone,
        lead.empreendimento,
        mensagensMap.get(i) || `Olá, ${lead.nome.split(' ')[0]}! ${intencao}`,
        'pendente'
      );
      pIdx += 7;
    }

    await pool.query(
      `INSERT INTO disparo_leads (disparo_id, lead_cvcrm_id, lead_nome, lead_telefone, lead_empreendimento, mensagem_gerada, status)
       VALUES ${insertValues.join(', ')}`,
      insertParams
    );

    return NextResponse.json({
      success: true,
      disparo_id: disparoId,
      total: leads.length,
      status: 'enviando',
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Disparador POST] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao criar disparo' },
      { status: 500 }
    );
  }
}
