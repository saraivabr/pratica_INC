/**
 * Memória de Longo Prazo da Sofia
 *
 * Persiste preferências, histórico e comportamento do usuário
 * para personalização e aprendizado contínuo
 */

import { dbQuery } from '@/lib/db';

// ============================================
// TIPOS
// ============================================

export interface UserPreferences {
  empreendimentosFavoritos: string[];
  faixaPreco: {
    min: number;
    max: number;
  } | null;
  regiaoAtuacao: string[];
}

export interface UserHistory {
  ultimosClientes: Array<{
    nome: string;
    telefone?: string;
    empreendimento?: string;
    data: string;
  }>;
  taxaConversao: number;
  ticketMedio: number;
}

export interface UserBehavior {
  horarioAtivo: {
    inicio: number; // hora (0-23)
    fim: number;
  } | null;
  diasMaisAtivos: number[]; // 0-6 (domingo-sábado)
  tempoMedioResposta: number; // em minutos
}

export interface UserMemory {
  id: string;
  userId: string;
  preferencias: UserPreferences;
  historico: UserHistory;
  comportamento: UserBehavior;
  metadata: {
    totalInteracoes: number;
    primeiraInteracao: string;
    ultimaInteracao: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Interaction {
  type: 'message' | 'search' | 'simulation' | 'share' | 'call';
  timestamp: string;
  data: {
    empreendimento?: string;
    empreendimentoId?: string;
    valor?: number;
    cliente?: {
      nome?: string;
      telefone?: string;
    };
    regiao?: string;
    responseTime?: number; // em segundos
    converted?: boolean;
  };
}

// ============================================
// FUNÇÕES PRINCIPAIS
// ============================================

/**
 * Busca memória do usuário
 */
export async function getUserMemory(userId: string): Promise<UserMemory | null> {
  const { rows } = await dbQuery(
    `SELECT * FROM user_memory WHERE user_id = $1 LIMIT 1`,
    [userId]
  );

  if (!rows[0]) {
    return null;
  }

  return mapRowToUserMemory(rows[0]);
}

/**
 * Cria ou atualiza memória do usuário
 */
export async function updateUserMemory(
  userId: string,
  data: Partial<Omit<UserMemory, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<UserMemory> {
  const existing = await getUserMemory(userId);

  if (existing) {
    // Merge dos dados existentes com os novos
    const updatedPreferencias = data.preferencias
      ? { ...existing.preferencias, ...data.preferencias }
      : existing.preferencias;

    const updatedHistorico = data.historico
      ? { ...existing.historico, ...data.historico }
      : existing.historico;

    const updatedComportamento = data.comportamento
      ? { ...existing.comportamento, ...data.comportamento }
      : existing.comportamento;

    const updatedMetadata = data.metadata
      ? { ...existing.metadata, ...data.metadata, ultimaInteracao: new Date().toISOString() }
      : { ...existing.metadata, ultimaInteracao: new Date().toISOString() };

    const { rows } = await dbQuery(
      `UPDATE user_memory
       SET preferencias = $1,
           historico = $2,
           comportamento = $3,
           metadata = $4,
           updated_at = NOW()
       WHERE user_id = $5
       RETURNING *`,
      [
        JSON.stringify(updatedPreferencias),
        JSON.stringify(updatedHistorico),
        JSON.stringify(updatedComportamento),
        JSON.stringify(updatedMetadata),
        userId,
      ]
    );

    return mapRowToUserMemory(rows[0]);
  }

  // Criar nova memória
  const defaultMemory = createDefaultMemory(userId);
  const newPreferencias = data.preferencias
    ? { ...defaultMemory.preferencias, ...data.preferencias }
    : defaultMemory.preferencias;

  const newHistorico = data.historico
    ? { ...defaultMemory.historico, ...data.historico }
    : defaultMemory.historico;

  const newComportamento = data.comportamento
    ? { ...defaultMemory.comportamento, ...data.comportamento }
    : defaultMemory.comportamento;

  const newMetadata = {
    totalInteracoes: 1,
    primeiraInteracao: new Date().toISOString(),
    ultimaInteracao: new Date().toISOString(),
    ...(data.metadata || {}),
  };

  const { rows } = await dbQuery(
    `INSERT INTO user_memory (user_id, preferencias, historico, comportamento, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      userId,
      JSON.stringify(newPreferencias),
      JSON.stringify(newHistorico),
      JSON.stringify(newComportamento),
      JSON.stringify(newMetadata),
    ]
  );

  return mapRowToUserMemory(rows[0]);
}

/**
 * Aprende com interações do usuário
 */
export async function learnFromInteraction(
  userId: string,
  interaction: Interaction
): Promise<UserMemory> {
  const memory = await getUserMemory(userId) || createDefaultMemory(userId);

  const updates: Partial<UserMemory> = {
    metadata: {
      ...memory.metadata,
      totalInteracoes: memory.metadata.totalInteracoes + 1,
      ultimaInteracao: interaction.timestamp,
    },
  };

  // Aprender preferências de empreendimentos
  if (interaction.data.empreendimentoId) {
    const empreendimentosFavoritos = [...memory.preferencias.empreendimentosFavoritos];
    if (!empreendimentosFavoritos.includes(interaction.data.empreendimentoId)) {
      empreendimentosFavoritos.push(interaction.data.empreendimentoId);
      // Manter apenas os últimos 10 favoritos
      if (empreendimentosFavoritos.length > 10) {
        empreendimentosFavoritos.shift();
      }
    }
    updates.preferencias = {
      ...memory.preferencias,
      empreendimentosFavoritos,
    };
  }

  // Aprender faixa de preço baseada em simulações e buscas
  if (interaction.data.valor && (interaction.type === 'simulation' || interaction.type === 'search')) {
    const valor = interaction.data.valor;
    const faixaAtual = memory.preferencias.faixaPreco;

    if (!faixaAtual) {
      updates.preferencias = {
        ...(updates.preferencias || memory.preferencias),
        faixaPreco: { min: valor * 0.8, max: valor * 1.2 },
      };
    } else {
      updates.preferencias = {
        ...(updates.preferencias || memory.preferencias),
        faixaPreco: {
          min: Math.min(faixaAtual.min, valor * 0.9),
          max: Math.max(faixaAtual.max, valor * 1.1),
        },
      };
    }
  }

  // Aprender região de atuação
  if (interaction.data.regiao) {
    const regiaoAtuacao = [...memory.preferencias.regiaoAtuacao];
    if (!regiaoAtuacao.includes(interaction.data.regiao)) {
      regiaoAtuacao.push(interaction.data.regiao);
      // Manter apenas as últimas 5 regiões
      if (regiaoAtuacao.length > 5) {
        regiaoAtuacao.shift();
      }
    }
    updates.preferencias = {
      ...(updates.preferencias || memory.preferencias),
      regiaoAtuacao,
    };
  }

  // Atualizar histórico de clientes
  if (interaction.data.cliente?.nome) {
    const ultimosClientes = [...memory.historico.ultimosClientes];
    ultimosClientes.push({
      nome: interaction.data.cliente.nome,
      telefone: interaction.data.cliente.telefone,
      empreendimento: interaction.data.empreendimento,
      data: interaction.timestamp,
    });
    // Manter apenas os últimos 20 clientes
    if (ultimosClientes.length > 20) {
      ultimosClientes.shift();
    }
    updates.historico = {
      ...memory.historico,
      ultimosClientes,
    };
  }

  // Atualizar taxa de conversão se houve conversão
  if (interaction.data.converted !== undefined) {
    const totalInteracoes = memory.metadata.totalInteracoes + 1;
    const conversoes = Math.round(memory.historico.taxaConversao * memory.metadata.totalInteracoes / 100);
    const novasConversoes = conversoes + (interaction.data.converted ? 1 : 0);
    const novaTaxaConversao = (novasConversoes / totalInteracoes) * 100;

    updates.historico = {
      ...(updates.historico || memory.historico),
      taxaConversao: Math.round(novaTaxaConversao * 100) / 100,
    };
  }

  // Aprender comportamento de horário
  const hora = new Date(interaction.timestamp).getHours();
  const dia = new Date(interaction.timestamp).getDay();

  const comportamento = { ...memory.comportamento };

  // Atualizar horário ativo
  if (!comportamento.horarioAtivo) {
    comportamento.horarioAtivo = { inicio: hora, fim: hora };
  } else {
    if (hora < comportamento.horarioAtivo.inicio) {
      comportamento.horarioAtivo.inicio = hora;
    }
    if (hora > comportamento.horarioAtivo.fim) {
      comportamento.horarioAtivo.fim = hora;
    }
  }

  // Atualizar dias mais ativos
  if (!comportamento.diasMaisAtivos.includes(dia)) {
    comportamento.diasMaisAtivos.push(dia);
    comportamento.diasMaisAtivos.sort((a, b) => a - b);
  }

  // Atualizar tempo médio de resposta
  if (interaction.data.responseTime !== undefined) {
    const tempoEmMinutos = interaction.data.responseTime / 60;
    if (comportamento.tempoMedioResposta === 0) {
      comportamento.tempoMedioResposta = tempoEmMinutos;
    } else {
      // Média móvel ponderada
      comportamento.tempoMedioResposta =
        (comportamento.tempoMedioResposta * 0.7) + (tempoEmMinutos * 0.3);
    }
    comportamento.tempoMedioResposta = Math.round(comportamento.tempoMedioResposta * 100) / 100;
  }

  updates.comportamento = comportamento;

  return updateUserMemory(userId, updates);
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Cria memória padrão para novo usuário
 */
function createDefaultMemory(userId: string): UserMemory {
  const now = new Date().toISOString();
  return {
    id: '',
    userId,
    preferencias: {
      empreendimentosFavoritos: [],
      faixaPreco: null,
      regiaoAtuacao: [],
    },
    historico: {
      ultimosClientes: [],
      taxaConversao: 0,
      ticketMedio: 0,
    },
    comportamento: {
      horarioAtivo: null,
      diasMaisAtivos: [],
      tempoMedioResposta: 0,
    },
    metadata: {
      totalInteracoes: 0,
      primeiraInteracao: now,
      ultimaInteracao: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Mapeia row do banco para UserMemory
 */
function mapRowToUserMemory(row: any): UserMemory {
  const parseJson = (value: any, defaultValue: any) => {
    if (!value) return defaultValue;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    }
    return value;
  };

  return {
    id: row.id,
    userId: row.user_id,
    preferencias: parseJson(row.preferencias, {
      empreendimentosFavoritos: [],
      faixaPreco: null,
      regiaoAtuacao: [],
    }),
    historico: parseJson(row.historico, {
      ultimosClientes: [],
      taxaConversao: 0,
      ticketMedio: 0,
    }),
    comportamento: parseJson(row.comportamento, {
      horarioAtivo: null,
      diasMaisAtivos: [],
      tempoMedioResposta: 0,
    }),
    metadata: parseJson(row.metadata, {
      totalInteracoes: 0,
      primeiraInteracao: row.created_at,
      ultimaInteracao: row.updated_at,
    }),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================
// FUNÇÕES DE CONSULTA
// ============================================

/**
 * Obtém sugestões de empreendimentos baseadas no histórico
 */
export async function getSuggestedEmpreendimentos(userId: string): Promise<string[]> {
  const memory = await getUserMemory(userId);
  if (!memory) return [];

  // Retorna os favoritos mais recentes
  return memory.preferencias.empreendimentosFavoritos.slice(-5);
}

/**
 * Verifica se usuário está no horário ativo
 */
export function isUserActiveHours(memory: UserMemory): boolean {
  if (!memory.comportamento.horarioAtivo) return true;

  const horaAtual = new Date().getHours();
  const { inicio, fim } = memory.comportamento.horarioAtivo;

  return horaAtual >= inicio && horaAtual <= fim;
}

/**
 * Obtém resumo da memória do usuário para contexto do prompt
 */
export function getMemorySummary(memory: UserMemory): string {
  const parts: string[] = [];

  if (memory.preferencias.empreendimentosFavoritos.length > 0) {
    parts.push(`Empreendimentos favoritos: ${memory.preferencias.empreendimentosFavoritos.slice(-3).join(', ')}`);
  }

  if (memory.preferencias.faixaPreco) {
    parts.push(
      `Faixa de preço: R$ ${memory.preferencias.faixaPreco.min.toLocaleString('pt-BR')} - R$ ${memory.preferencias.faixaPreco.max.toLocaleString('pt-BR')}`
    );
  }

  if (memory.preferencias.regiaoAtuacao.length > 0) {
    parts.push(`Regiões: ${memory.preferencias.regiaoAtuacao.join(', ')}`);
  }

  if (memory.historico.taxaConversao > 0) {
    parts.push(`Taxa de conversão: ${memory.historico.taxaConversao}%`);
  }

  if (memory.historico.ticketMedio > 0) {
    parts.push(`Ticket médio: R$ ${memory.historico.ticketMedio.toLocaleString('pt-BR')}`);
  }

  parts.push(`Total de interações: ${memory.metadata.totalInteracoes}`);

  return parts.join(' | ');
}

// ============================================
// SQL PARA CRIAR TABELA
// ============================================

/**
 * SQL para criar a tabela user_memory
 * Execute este SQL no Supabase para criar a estrutura necessária:
 *
 * CREATE TABLE IF NOT EXISTS user_memory (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 *   preferencias JSONB NOT NULL DEFAULT '{}',
 *   historico JSONB NOT NULL DEFAULT '{}',
 *   comportamento JSONB NOT NULL DEFAULT '{}',
 *   metadata JSONB NOT NULL DEFAULT '{}',
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   UNIQUE(user_id)
 * );
 *
 * CREATE INDEX idx_user_memory_user_id ON user_memory(user_id);
 *
 * -- Trigger para atualizar updated_at automaticamente
 * CREATE OR REPLACE FUNCTION update_user_memory_updated_at()
 * RETURNS TRIGGER AS $$
 * BEGIN
 *   NEW.updated_at = NOW();
 *   RETURN NEW;
 * END;
 * $$ LANGUAGE plpgsql;
 *
 * CREATE TRIGGER trigger_user_memory_updated_at
 *   BEFORE UPDATE ON user_memory
 *   FOR EACH ROW
 *   EXECUTE FUNCTION update_user_memory_updated_at();
 */
export const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferencias JSONB NOT NULL DEFAULT '{}',
  historico JSONB NOT NULL DEFAULT '{}',
  comportamento JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_memory_user_id ON user_memory(user_id);
`;
