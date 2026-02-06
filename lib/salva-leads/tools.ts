/**
 * Salva-Leads Agent Tools
 *
 * Ferramentas disponiveis para o agente de IA responder leads no WhatsApp.
 * Cada ferramenta tem acesso ao contexto da conversa (SalvaLeadsConversation) e ao workspaceId.
 */

import { withTenant } from '@/lib/tenant-context';
import { getUnidadesCVCRM, getEmpreendimentosCVCRM } from '@/lib/cvcrm-client';
import {
  sendPresence,
  formatPhoneNumber
} from '@/lib/evolution-api';
import { getCorretorEvolutionInstance, sendToCorretor } from '@/lib/evolution-helpers';
import type { SalvaLeadsToolDefinition, SalvaLeadsConversation } from './types';

// ============================================================================
// FERRAMENTA: get_imoveis
// Busca imoveis disponiveis filtrando por caracteristicas
// Implementa:
// - Variacao de +-20% em filtros numericos (valor, quartos, metragem)
// - Fallback inteligente quando nao encontra resultados
// - Sugestoes quando busca estrita retorna vazio
// ============================================================================

// Constante para variação percentual dos filtros numéricos
const NUMERIC_FILTER_VARIATION = 0.2; // 20%

/**
 * Aplica variação de ±20% a um valor numérico
 */
function applyVariation(value: number, direction: 'up' | 'down' | 'both'): { min: number; max: number } {
  const variation = value * NUMERIC_FILTER_VARIATION;
  if (direction === 'up') {
    return { min: value, max: value + variation };
  } else if (direction === 'down') {
    return { min: value - variation, max: value };
  }
  return { min: value - variation, max: value + variation };
}

/**
 * Busca imóveis com filtros e fallback inteligente
 */
async function executeGetImoveis(
  args: Record<string, any>,
  context: SalvaLeadsConversation,
  workspaceId: number
) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Salva-Leads] get_imoveis:', args, 'workspaceId:', workspaceId);
  }

  try {
    // 1. Carregar dados (snapshot local ou API)
    const { empreendimentos, unidades } = await loadImoveisData(workspaceId);

    // 2. Primeira tentativa: filtros estritos
    let result = filterImoveis(empreendimentos, unidades, args, { strict: true });

    // 3. Se não encontrou, tenta com variação de ±20%
    if (result.imoveis.length === 0 && (args.valor_max || args.quartos)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Salva-Leads] Busca estrita vazia, tentando com variacao de +-20%');
      }
      result = filterImoveis(empreendimentos, unidades, args, { strict: false, variation: NUMERIC_FILTER_VARIATION });
      if (result.imoveis.length > 0) {
        result.usedVariation = true;
      }
    }

    // 4. Se ainda não encontrou, tenta fallback removendo filtros não-essenciais
    if (result.imoveis.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Salva-Leads] Busca com variacao vazia, tentando fallback');
      }
      result = filterImoveisFallback(empreendimentos, unidades, args);
    }

    // 5. Montar mensagem de retorno
    let message = '';
    if (result.imoveis.length > 0) {
      if (result.usedFallback) {
        message = `Nao encontrei com os criterios exatos, mas achei ${result.imoveis.length} opcoes similares${result.relaxedFilters ? ` (sem filtro de ${result.relaxedFilters})` : ''}`;
      } else if (result.usedVariation) {
        message = `Encontrei ${result.imoveis.length} imoveis com valor proximo ao solicitado (variacao de ate 20%)`;
      } else {
        message = `Encontrei ${result.imoveis.length} imoveis disponiveis`;
      }
    } else {
      message = buildNoResultsMessage(args);
    }

    return {
      found: result.imoveis.length,
      imoveis: result.imoveis,
      message,
      usedVariation: result.usedVariation || false,
      usedFallback: result.usedFallback || false,
      relaxedFilters: result.relaxedFilters
    };
  } catch (error) {
    console.error('[Salva-Leads] Erro em get_imoveis:', error);
    return {
      found: 0,
      imoveis: [],
      message: 'Erro ao buscar imoveis. Tente novamente.'
    };
  }
}

/**
 * Carrega dados de imóveis (snapshot local ou API)
 */
async function loadImoveisData(workspaceId: number): Promise<{ empreendimentos: any[]; unidades: any[] }> {
  // 1. Primeiro tenta buscar do snapshot local (mais rapido)
  const snapshotResult = await withTenant(workspaceId, async (client) => {
    return client.query(
      `SELECT empreendimentos, unidades
       FROM cvcrm_snapshots
       ORDER BY created_at DESC
       LIMIT 1`
    );
  });
  const snapshot = snapshotResult.rows[0];

  let empreendimentos: any[] = [];
  let unidades: any[] = [];

  if (snapshot?.empreendimentos?.length) {
    empreendimentos = snapshot.empreendimentos;
    unidades = snapshot.unidades || [];
  } else {
    // 2. Fallback: busca direto do CV CRM
    const [empResponse, unidResponse] = await Promise.all([
      getEmpreendimentosCVCRM(),
      getUnidadesCVCRM({})
    ]);

    const empAny = empResponse as any;
    empreendimentos = Array.isArray(empResponse)
      ? empResponse
      : (empAny.empreendimentos || empAny.data || []);

    const unidAny = unidResponse as any;
    unidades = Array.isArray(unidResponse)
      ? unidResponse
      : (unidAny.data || unidAny.unidades || []);
  }

  return { empreendimentos, unidades };
}

/**
 * Filtra imóveis com opções de variação
 */
function filterImoveis(
  empreendimentos: any[],
  unidades: any[],
  args: Record<string, any>,
  options: { strict?: boolean; variation?: number } = {}
): {
  imoveis: any[];
  usedVariation?: boolean;
  usedFallback?: boolean;
  relaxedFilters?: string;
} {
  const { strict = true, variation = 0 } = options;

  // 1. Filtrar empreendimentos por cidade/bairro/tipo
  let filteredEmps = empreendimentos;

  if (args.cidade) {
    const cidadeLower = args.cidade.toLowerCase();
    filteredEmps = filteredEmps.filter((emp: any) => {
      const empCidade = (emp.cidade || emp.cidade_nome || '').toLowerCase();
      return empCidade.includes(cidadeLower);
    });
  }

  if (args.bairro) {
    const bairroLower = args.bairro.toLowerCase();
    filteredEmps = filteredEmps.filter((emp: any) => {
      const empBairro = (emp.bairro || emp.bairro_nome || '').toLowerCase();
      return empBairro.includes(bairroLower);
    });
  }

  if (args.tipo_imovel) {
    const tipoLower = args.tipo_imovel.toLowerCase();
    filteredEmps = filteredEmps.filter((emp: any) => {
      const empTipo = (emp.tipo || emp.tipo_empreendimento || '').toLowerCase();
      return empTipo.includes(tipoLower);
    });
  }

  // 2. Filtrar unidades por empreendimento e disponibilidade
  const empIds = new Set(filteredEmps.map((e: any) =>
    String(e.idempreendimento || e.id)
  ));

  let filteredUnidades = unidades.filter((u: any) => {
    const empId = String(u.idempreendimento || u.empreendimento_id || '');
    if (!empIds.has(empId)) return false;

    // Filtrar apenas disponiveis
    const situacao = String(u.situacao || u.idunidadesituacao || '').toUpperCase();
    const vendido = ['V', 'VENDIDA', 'VENDIDO'].includes(situacao);
    const reservado = ['R', 'RESERVADA', 'RESERVADO', 'B', 'BLOQUEADA'].includes(situacao);
    if (vendido || reservado) return false;

    return true;
  });

  // 3. Filtrar por valor (com variação se não estrito)
  if (args.valor_max) {
    const valorMax = strict
      ? args.valor_max
      : args.valor_max * (1 + variation); // +20% para cima

    filteredUnidades = filteredUnidades.filter((u: any) => {
      const valor = Number(u.valor || u.valortabela || u.preco || 0);
      return valor > 0 && valor <= valorMax;
    });
  }

  // 4. Filtrar por quartos (com variação se não estrito)
  if (args.quartos) {
    const quartosMin = strict
      ? args.quartos
      : Math.max(1, Math.floor(args.quartos * (1 - variation))); // -20% (min 1)

    filteredUnidades = filteredUnidades.filter((u: any) => {
      const quartos = Number(u.quartos || u.dormitorios || 0);
      // Se nao tem info de quartos, mantem no resultado
      return quartos === 0 || quartos >= quartosMin;
    });
  }

  // 5. Filtrar por metragem (se especificado, com variação)
  if (args.metragem_min) {
    const metragemMin = strict
      ? args.metragem_min
      : args.metragem_min * (1 - variation); // -20%

    filteredUnidades = filteredUnidades.filter((u: any) => {
      const metragem = Number(u.areaprivativa || u.metragem || 0);
      return metragem === 0 || metragem >= metragemMin;
    });
  }

  // 6. Criar mapa de empreendimentos e montar resultado
  const empMap = new Map<string, any>();
  filteredEmps.forEach((emp: any) => {
    const id = String(emp.idempreendimento || emp.id);
    empMap.set(id, emp);
  });

  const imoveis = filteredUnidades.slice(0, 10).map((u: any) => {
    const empId = String(u.idempreendimento || u.empreendimento_id);
    const emp = empMap.get(empId) || {};

    return {
      cod_imovel: String(u.idunidade || u.id),
      empreendimento: emp.nome || 'N/A',
      unidade: u.unidade || u.nome || 'N/A',
      bloco: u.bloco || u.torre || '',
      tipo: emp.tipo || u.tipo || '',
      bairro: emp.bairro || emp.bairro_nome || '',
      cidade: emp.cidade || emp.cidade_nome || '',
      valor: Number(u.valor || u.valortabela || 0),
      metragem: Number(u.areaprivativa || u.metragem || 0),
      quartos: Number(u.quartos || u.dormitorios || 0),
    };
  });

  return { imoveis };
}

/**
 * Fallback: busca relaxando filtros progressivamente
 */
function filterImoveisFallback(
  empreendimentos: any[],
  unidades: any[],
  args: Record<string, any>
): {
  imoveis: any[];
  usedFallback: boolean;
  relaxedFilters?: string;
} {
  // Tenta remover filtros em ordem de prioridade
  const relaxOrder = ['valor_max', 'quartos', 'bairro'];
  let relaxed: string[] = [];

  for (const filter of relaxOrder) {
    if (!args[filter]) continue;

    const newArgs = { ...args };
    delete newArgs[filter];
    relaxed.push(filter);

    const result = filterImoveis(empreendimentos, unidades, newArgs, { strict: false, variation: NUMERIC_FILTER_VARIATION });
    if (result.imoveis.length > 0) {
      return {
        imoveis: result.imoveis,
        usedFallback: true,
        relaxedFilters: relaxed.join(', ')
      };
    }
  }

  // Última tentativa: apenas cidade e tipo
  if (args.cidade || args.tipo_imovel) {
    const minimalArgs: Record<string, any> = {};
    if (args.cidade) minimalArgs.cidade = args.cidade;
    if (args.tipo_imovel) minimalArgs.tipo_imovel = args.tipo_imovel;

    const result = filterImoveis(empreendimentos, unidades, minimalArgs, { strict: true });
    if (result.imoveis.length > 0) {
      return {
        imoveis: result.imoveis.slice(0, 5), // Limita a 5 no fallback
        usedFallback: true,
        relaxedFilters: 'bairro, valor, quartos'
      };
    }
  }

  return { imoveis: [], usedFallback: true };
}

/**
 * Gera mensagem quando não encontra resultados
 */
function buildNoResultsMessage(args: Record<string, any>): string {
  const suggestions: string[] = [];

  if (args.valor_max) {
    const valorFormatado = Number(args.valor_max).toLocaleString('pt-BR');
    suggestions.push(`aumentar o orcamento (atual: R$ ${valorFormatado})`);
  }

  if (args.bairro && args.cidade) {
    suggestions.push(`considerar outros bairros em ${args.cidade}`);
  }

  if (args.quartos && args.quartos > 2) {
    suggestions.push(`considerar imoveis com ${args.quartos - 1} quartos`);
  }

  if (suggestions.length > 0) {
    return `Nao encontrei imoveis com esses criterios. Sugestoes: ${suggestions.join('; ')}.`;
  }

  return 'Nao encontrei imoveis com esses criterios. Podemos ajustar a busca?';
}

// ============================================================================
// FERRAMENTA: post_visita
// Agenda uma visita em um imovel especifico
// ============================================================================

async function executePostVisita(
  args: Record<string, any>,
  context: SalvaLeadsConversation,
  workspaceId: number
) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Salva-Leads] post_visita:', args, 'workspaceId:', workspaceId);
  }

  try {
    // 1. Registrar interesse/agendamento no banco
    const { cod_imovel, data_sugerida, periodo, observacao } = args;

    await withTenant(workspaceId, async (client) => {
      await client.query(
        `INSERT INTO salva_leads_visitas
         (workspace_id, lead_phone, lead_name, cod_imovel, data_sugerida, periodo, observacao, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          workspaceId,
          context.lead_phone,
          context.lead_name || null,
          cod_imovel,
          data_sugerida || null,
          periodo || null,
          observacao || null
        ]
      );
    }).catch(err => {
      // Tabela pode nao existir ainda, log mas nao falha
      console.warn('[Salva-Leads] Tabela salva_leads_visitas nao existe:', err.message);
    });

    // 2. Notificar corretor se configurado (via Z-API - sistema→corretor)
    if (context.corretor_id) {
      const corretorResult = await withTenant(workspaceId, async (client) => {
        return client.query(
          `SELECT telefone FROM users WHERE id = $1`,
          [context.corretor_id]
        );
      }).catch(() => ({ rows: [] }));

      const corretorPhone = corretorResult.rows[0]?.telefone || context.corretor_phone;

      if (corretorPhone) {
        const notificacao = [
          `Novo interesse de visita!`,
          `Cliente: ${context.lead_name || context.lead_phone}`,
          `Imovel: ${cod_imovel}`,
          data_sugerida ? `Data sugerida: ${data_sugerida}` : '',
          periodo ? `Periodo: ${periodo}` : '',
          observacao ? `Obs: ${observacao}` : ''
        ].filter(Boolean).join('\n');

        try {
          await sendToCorretor(corretorPhone, notificacao);
        } catch (e) {
          console.warn('[Salva-Leads] Erro ao notificar corretor:', e);
        }
      }
    }

    return {
      success: true,
      message: 'Interesse registrado! Um corretor entrara em contato em breve.',
      cod_imovel,
      data_sugerida,
      periodo
    };
  } catch (error) {
    console.error('[Salva-Leads] Erro em post_visita:', error);
    return {
      success: false,
      message: 'Erro ao registrar visita. Por favor, tente novamente.'
    };
  }
}

// ============================================================================
// FERRAMENTA: notify_client
// Envia indicador de "digitando..." para o cliente
// ============================================================================

async function executeNotifyClient(
  args: Record<string, any>,
  context: SalvaLeadsConversation,
  workspaceId: number
) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Salva-Leads] notify_client: sending presence');
  }

  try {
    // Buscar instância Evolution do corretor desta conversa
    const instance = context.corretor_id
      ? await getCorretorEvolutionInstance(context.corretor_id)
      : null;

    if (instance?.connected) {
      await sendPresence(
        instance.instanceName,
        formatPhoneNumber(context.lead_phone),
        'composing'
      );
      return { sent: true };
    }

    return { sent: false, reason: 'corretor sem Evolution conectado' };
  } catch (error) {
    console.warn('[Salva-Leads] Erro ao enviar presence:', error);
    return { sent: false };
  }
}

// ============================================================================
// FERRAMENTA: transfer_to_corretor
// Transfere a conversa para o corretor humano
// ============================================================================

async function executeTransferToCorretor(
  args: Record<string, any>,
  context: SalvaLeadsConversation,
  workspaceId: number
) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Salva-Leads] transfer_to_corretor:', args.motivo);
  }

  try {
    // 1. Marcar conversa como transferida no banco
    await withTenant(workspaceId, async (client) => {
      await client.query(
        `UPDATE salva_leads_conversations
         SET bot_paused = true,
             bot_paused_at = NOW(),
             status = 'paused_by_corretor'
         WHERE id = $1`,
        [context.id]
      );
    }).catch(err => {
      console.warn('[Salva-Leads] Erro ao atualizar conversa:', err.message);
    });

    // 2. Notificar corretor (via Z-API - sistema→corretor)
    if (context.corretor_id) {
      const corretorResult = await withTenant(workspaceId, async (client) => {
        return client.query(
          `SELECT telefone FROM users WHERE id = $1`,
          [context.corretor_id]
        );
      }).catch(() => ({ rows: [] }));

      const corretorPhone = corretorResult.rows[0]?.telefone || context.corretor_phone;

      if (corretorPhone) {
        const notificacao = [
          `Conversa transferida!`,
          `Cliente: ${context.lead_name || context.lead_phone}`,
          `Telefone: ${context.lead_phone}`,
          args.motivo ? `Motivo: ${args.motivo}` : ''
        ].filter(Boolean).join('\n');

        try {
          await sendToCorretor(corretorPhone, notificacao);
        } catch (e) {
          console.warn('[Salva-Leads] Erro ao notificar corretor:', e);
        }
      }
    }

    return {
      transferred: true,
      message: 'Conversa transferida para o corretor. Ele entrara em contato em breve.'
    };
  } catch (error) {
    console.error('[Salva-Leads] Erro em transfer_to_corretor:', error);
    return {
      transferred: false,
      message: 'Erro ao transferir conversa.'
    };
  }
}

// ============================================================================
// FERRAMENTA: think
// Permite ao agente raciocinar internamente antes de responder
// ============================================================================

async function executeThink(
  args: Record<string, any>,
  context: SalvaLeadsConversation,
  workspaceId: number
) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Salva-Leads] think:', args.pensamento?.slice(0, 100));
  }

  // Esta tool nao faz nada externamente - apenas permite ao LLM
  // estruturar seu raciocinio antes de responder
  return {
    thought: args.pensamento,
    processed: true,
    message: 'Raciocinio processado internamente.'
  };
}

// ============================================================================
// FERRAMENTA: get_conhecimento
// Busca conhecimento da empresa (RAG)
// ============================================================================

async function executeGetConhecimento(
  args: Record<string, any>,
  context: SalvaLeadsConversation,
  workspaceId: number
) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Salva-Leads] get_conhecimento:', args.pergunta);
  }

  try {
    // Buscar documentos de conhecimento do tenant
    const result = await withTenant(workspaceId, async (client) => {
      return client.query(
        `SELECT titulo, conteudo, categoria
         FROM conhecimento_base
         WHERE workspace_id = $1
           AND (
             titulo ILIKE $2
             OR conteudo ILIKE $2
             OR categoria ILIKE $2
           )
         ORDER BY
           CASE WHEN titulo ILIKE $2 THEN 0
                WHEN categoria ILIKE $2 THEN 1
                ELSE 2 END,
           created_at DESC
         LIMIT 5`,
        [workspaceId, `%${args.pergunta}%`]
      );
    }).catch(() => ({ rows: [] }));

    if (result.rows.length === 0) {
      // Fallback: buscar informacoes do workspace/empresa
      const workspaceResult = await withTenant(workspaceId, async (client) => {
        return client.query(
          `SELECT name FROM workspaces WHERE id = $1`,
          [workspaceId]
        );
      }).catch(() => ({ rows: [] }));

      const workspace = workspaceResult.rows[0];
      if (workspace) {
        return {
          found: 1,
          conhecimentos: [{
            titulo: 'Informacoes da Empresa',
            conteudo: `Empresa: ${workspace.name}. Para informacoes mais detalhadas, consulte o corretor.`,
            categoria: 'empresa'
          }],
          message: 'Informacoes basicas da empresa encontradas.'
        };
      }

      return {
        found: 0,
        conhecimentos: [],
        message: 'Nao encontrei informacoes sobre isso. Posso verificar com o corretor.'
      };
    }

    return {
      found: result.rows.length,
      conhecimentos: result.rows.map((row: any) => ({
        titulo: row.titulo,
        conteudo: row.conteudo,
        categoria: row.categoria
      })),
      message: `Encontrei ${result.rows.length} informacao(oes) relevante(s).`
    };
  } catch (error) {
    console.error('[Salva-Leads] Erro em get_conhecimento:', error);
    return {
      found: 0,
      conhecimentos: [],
      message: 'Erro ao buscar conhecimento.'
    };
  }
}

// ============================================================================
// DEFINICAO DAS FERRAMENTAS
// ============================================================================

export const SALVA_LEADS_TOOLS: SalvaLeadsToolDefinition[] = [
  {
    name: 'get_imoveis',
    description: 'Busca imoveis disponiveis filtrando por caracteristicas. Use para encontrar opcoes para o cliente. Se nao encontrar resultados exatos, automaticamente aplica variacao de +-20% nos filtros numericos.',
    parameters: {
      type: 'object',
      properties: {
        tipo_imovel: {
          type: 'string',
          description: 'Tipo do imovel: apartamento, casa, terreno, comercial, etc'
        },
        bairro: {
          type: 'string',
          description: 'Nome do bairro'
        },
        cidade: {
          type: 'string',
          description: 'Nome da cidade'
        },
        valor_max: {
          type: 'number',
          description: 'Valor maximo em reais (aceita variacao de ate +20%)'
        },
        quartos: {
          type: 'number',
          description: 'Numero minimo de quartos (aceita variacao de ate -20%)'
        },
        metragem_min: {
          type: 'number',
          description: 'Metragem minima em m2 (aceita variacao de ate -20%)'
        }
      }
    },
    execute: executeGetImoveis
  },
  {
    name: 'post_visita',
    description: 'Agenda uma visita em um imovel especifico. Use quando o cliente confirmar interesse em visitar.',
    parameters: {
      type: 'object',
      properties: {
        cod_imovel: {
          type: 'string',
          description: 'Codigo do imovel para visita'
        },
        data_sugerida: {
          type: 'string',
          description: 'Data sugerida para visita (formato: YYYY-MM-DD)'
        },
        periodo: {
          type: 'string',
          enum: ['manha', 'tarde', 'noite'],
          description: 'Periodo preferido'
        },
        observacao: {
          type: 'string',
          description: 'Observacoes adicionais'
        }
      },
      required: ['cod_imovel']
    },
    execute: executePostVisita
  },
  {
    name: 'notify_client',
    description: 'Envia indicador de "digitando..." para o cliente. Use antes de respostas que demoram.',
    parameters: {
      type: 'object',
      properties: {}
    },
    execute: executeNotifyClient
  },
  {
    name: 'transfer_to_corretor',
    description: 'Transfere a conversa para o corretor humano. Use quando o cliente pedir para falar com uma pessoa.',
    parameters: {
      type: 'object',
      properties: {
        motivo: {
          type: 'string',
          description: 'Motivo da transferencia'
        }
      }
    },
    execute: executeTransferToCorretor
  },
  {
    name: 'think',
    description: 'Use para raciocinar internamente antes de responder. Util para organizar pensamentos em situacoes complexas. NAO envia nada ao cliente.',
    parameters: {
      type: 'object',
      properties: {
        pensamento: {
          type: 'string',
          description: 'Seu raciocinio interno sobre a situacao atual'
        }
      },
      required: ['pensamento']
    },
    execute: executeThink
  },
  {
    name: 'get_conhecimento',
    description: 'Busca conhecimento sobre a empresa, empreendimentos, politicas ou procedimentos. Use quando precisar de informacoes que nao sao sobre imoveis especificos.',
    parameters: {
      type: 'object',
      properties: {
        pergunta: {
          type: 'string',
          description: 'O que voce quer saber (ex: "formas de pagamento", "documentos necessarios", "sobre a empresa")'
        }
      },
      required: ['pergunta']
    },
    execute: executeGetConhecimento
  }
];

// ============================================================================
// FUNCOES AUXILIARES
// ============================================================================

/**
 * Formata informacoes do imovel para mensagem de WhatsApp
 */
export function formatImovelForMessage(imovel: {
  empreendimento?: string;
  unidade?: string;
  bloco?: string;
  tipo?: string;
  bairro?: string;
  cidade?: string;
  valor?: number;
  metragem?: number;
  quartos?: number;
}): string {
  const parts: string[] = [];

  // Nome/identificacao
  if (imovel.empreendimento) {
    let nome = imovel.empreendimento;
    if (imovel.unidade) nome += ` - ${imovel.unidade}`;
    if (imovel.bloco) nome += ` (${imovel.bloco})`;
    parts.push(nome);
  }

  // Localizacao
  const loc = [imovel.bairro, imovel.cidade].filter(Boolean).join(', ');
  if (loc) parts.push(loc);

  // Caracteristicas
  const features: string[] = [];
  if (imovel.tipo) features.push(imovel.tipo);
  if (imovel.metragem) features.push(`${imovel.metragem}m2`);
  if (imovel.quartos) features.push(`${imovel.quartos}q`);
  if (features.length) parts.push(features.join(' | '));

  // Valor
  if (imovel.valor) {
    parts.push(`R$ ${imovel.valor.toLocaleString('pt-BR')}`);
  }

  return parts.join('\n');
}

/**
 * Formata lista de imoveis para mensagem de WhatsApp
 */
export function formatImoveisListForMessage(imoveis: any[]): string {
  if (!imoveis.length) {
    return 'Nenhum imovel encontrado com esses criterios.';
  }

  const header = `Encontrei ${imoveis.length} opcoes:\n`;
  const list = imoveis
    .slice(0, 5) // Limita a 5 para nao ficar muito longo
    .map((im, idx) => `${idx + 1}. ${formatImovelForMessage(im)}`)
    .join('\n\n');

  const footer = imoveis.length > 5
    ? `\n\n...e mais ${imoveis.length - 5} opcoes. Quer que eu refine a busca?`
    : '';

  return header + list + footer;
}

/**
 * Busca ferramenta pelo nome
 */
export function findTool(name: string): SalvaLeadsToolDefinition | undefined {
  return SALVA_LEADS_TOOLS.find(t => t.name === name);
}

/**
 * Executa uma ferramenta pelo nome
 */
export async function executeTool(
  name: string,
  args: Record<string, any>,
  context: SalvaLeadsConversation,
  workspaceId: number
): Promise<any> {
  const tool = findTool(name);
  if (!tool) {
    throw new Error(`Ferramenta nao encontrada: ${name}`);
  }
  return tool.execute(args, context, workspaceId);
}

/**
 * Retorna as definicoes de ferramentas no formato OpenAI/Anthropic
 */
export function getToolsForLLM(): Array<{
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}> {
  return SALVA_LEADS_TOOLS.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}
