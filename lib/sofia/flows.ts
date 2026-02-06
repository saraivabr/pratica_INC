/**
 * Fluxos Conversacionais da Sofia
 *
 * Máquina de estados para gerenciar conversas estruturadas
 */

import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { dbQuery } from '@/lib/db';
import { withTenant } from '@/lib/tenant-context';
import {
  sendTextMessage,
  sendQuickButtons,
  sendOptionList,
  sendActionButtons,
  sendDocument,
  sendImage,
  sendLocation,
  askYesNo,
  askAction,
  sendBairrosMenu,
  askEntrada,
  askPostSimulacao,
} from '@/lib/whatsapp-sender';
import { createInteracao, normalizePhone } from '@/lib/supabase';
import { getEmpreendimentosCVCRM, getUnidadesCVCRM } from '@/lib/cvcrm-client';
import {
  getReservaStatus,
  getComissoesCorretor,
  getMetasCorretor,
  getRankingEquipe,
  getCorretorIdByUserId,
  getLeadsByCorretor,
  getProximasAtividades,
  formatCurrency,
  type Comissao,
  type Atividade,
} from './cvcrm-queries';
import { criarLembrete, registrarAtividade } from './actions';
import { createSipOutboundCall } from '@/lib/elevenlabs';
import { processarTextoVenda } from './fluxo-vendedor';

import { buildSofiaSystemPrompt, buildPsychologicalSystemPrompt, delay, getTypingDelay, getPersonaByUser } from './persona';
import {
  ONBOARDING,
  SAUDACOES,
  BUSCA,
  SIMULACAO,
  SUPORTE,
  FEEDBACK,
  NAO_CADASTRADO,
  CADASTRO,
  STATUS,
  COMISSAO,
  METAS,
  OBJECAO,
  AGENDA,
  CONCORRENCIA,
  AJUDA_APP,
  getSaudacaoHorario,
  splitMessage,
} from './responses';
import { FAQ, buscarNoFAQ } from './faq';
import { ARGUMENTOS_VENDA, DIFERENCIAIS_PRATICA } from './knowledge';
import { detectIntent, isSimpleGreeting, isHumanRequest } from './intents';
import { buildRAGPrompt, retrieveContext, shouldUseRAG, searchSimilar } from './rag';
import {
  analyzeSentiment,
  shouldEscalate,
  getEmpathyMessage,
  type Sentiment,
} from './sentiment';
import {
  getOrCreateConversation,
  saveConversation,
  addMessage,
  updateContext,
  escalateContext,
  isInActiveFlow,
  formatMessagesForPrompt,
  type ConversationContext,
  type ConversationMessage,
  type FlowType,
} from './context';
import {
  checkSecurity,
  checkHighFrustration,
  sanitizeMessage,
} from './security';
import {
  PsychologyAnalyzer,
  analyzePsychology,
} from './langchain/psychology-analyzer';
import {
  buildEmpatheticOpening,
  adaptResponseToStyle,
} from './psychology/rapport-builder';
import {
  detectObjectionType,
  getObjectionReframe,
} from './psychology/objection-reframes';
import type { AgentConfig } from '@/lib/agents/types';
import type { PsychologicalAnalysis } from './psychology/types';

// ============================================
// CONFIGURAÇÃO
// ============================================

// Lazy initialization to avoid build-time errors
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000,
    });
  }
  return _openai;
}

// ============================================
// TIPOS
// ============================================

interface User {
  id: string;
  nome: string;
  telefone: string;
  role: 'corretor' | 'gerente' | 'admin';
  gerente_id?: string;
  imobiliaria_id?: string;
  imobiliarias?: {
    nome: string;
  };
  cvcrm_id?: number;
  workspace_id?: number;
}

interface FlowResult {
  messages: string[];
  context: ConversationContext;
  shouldUseAI: boolean;
  followUp?: (phone: string) => Promise<void>;
}

interface OnboardingLead {
  id: string;
  phone: string;
  name?: string | null;
  imobiliaria_name?: string | null;
  imobiliaria_id?: string | null;
  gerente_name?: string | null;
  gerente_id?: string | null;
  status: 'collecting' | 'ready' | 'created';
  step: 'name' | 'confirm_name' | 'imobiliaria' | 'confirm_imobiliaria' | 'gerente' | 'done';
}

// ============================================
// ENVIO DE MENSAGENS
// ============================================

/**
 * Envia mensagens divididas com delay humanizado
 */
async function sendSplitMessages(
  phone: string,
  messages: string[]
): Promise<void> {
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    // Dividir mensagem se muito longa
    const parts = splitMessage(msg);
    for (let j = 0; j < parts.length; j++) {
      const typingSeconds = Math.min(
        15,
        Math.max(1, Math.round(getTypingDelay(parts[j]) / 1000))
      );
      await sendTextMessage(phone, parts[j], { delayTyping: typingSeconds });
      if (j < parts.length - 1) {
        await delay(300);
      }
    }
  }
}

function buildEmpreendimentoLink(id: string, tab?: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pratica.escreve.ai';
  const tabParam = tab ? `?tab=${tab}` : '';
  return `${baseUrl}/empreendimentos/${id}${tabParam}`;
}

function buildEmpreendimentosListLink(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pratica.escreve.ai';
  return `${baseUrl}/empreendimentos`;
}

async function registerEmpreendimentoInteracao(
  userId: string,
  empreendimento: { id: string; nome: string },
  tipo: 'resumo' | 'comparacao' | 'unidade' | 'simulacao' | 'book' | 'condicoes',
  mensagem: string,
  context: ConversationContext,
  workspaceId?: number
): Promise<void> {
  try {
    await createInteracao({
      corretor_id: userId,
      empreendimento_id: empreendimento.id,
      empreendimento_nome: empreendimento.nome,
      tipo_material: tipo,
      lead_nome: context.entities?.nomeCliente,
      mensagem_enviada: mensagem,
      notas_internas: 'Sofia WhatsApp',
    }, workspaceId || 0);
  } catch (error) {
    console.warn('[Sofia] Erro ao registrar interacao:', error);
  }
}

function buildSimulacaoRegistro(params: {
  valor: number;
  entrada: number;
  percentual: number;
  prazo: number;
  parcela?: number;
  parcelaTotal?: number;
  cetAnual?: number;
  rendaMinima?: number;
  nomeCliente?: string;
}): string {
  const parts: string[] = [];
  if (params.nomeCliente) {
    parts.push(`Cliente: ${params.nomeCliente}.`);
  }
  parts.push('Simulacao enviada via WhatsApp.');
  parts.push(`Valor: ${formatCurrency(params.valor)}.`);
  parts.push(`Entrada: ${formatCurrency(params.entrada)} (${params.percentual}%).`);
  parts.push(`Prazo: ${params.prazo} meses.`);
  const parcelaValue = params.parcelaTotal || params.parcela;
  if (parcelaValue) {
    parts.push(`Parcela: ${formatCurrency(parcelaValue)}.`);
  }
  if (typeof params.cetAnual === 'number') {
    parts.push(`CET: ${params.cetAnual.toFixed(2)}% a.a.`);
  }
  if (typeof params.rendaMinima === 'number') {
    parts.push(`Renda minima: ${formatCurrency(params.rendaMinima)}.`);
  }
  return parts.join(' ');
}

function buildEmpreendimentoSnapshot(row: any): string | null {
  if (!row) return null;
  const data = row.cvcrm_data || row;
  const bairro = data?.bairro?.nome || data?.bairro || data?.bairro_nome;
  const cidade = row.cidade || data?.cidade?.nome || data?.cidade || data?.municipio;
  const uf = row.uf || data?.uf || data?.estado;
  const tipo = row.tipo || data?.tipo?.nome || data?.tipologia;
  const entregaRaw = row.data_entrega_prevista || data?.data_entrega || data?.previsao_entrega;
  const entregaDate = entregaRaw ? new Date(entregaRaw) : null;
  const entrega = entregaDate && !Number.isNaN(entregaDate.getTime())
    ? entregaDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    : null;
  const unidadesDisponiveis = Number(data?.unidades_disponiveis || row.unidades_disponiveis || 0);

  const parts: string[] = [];
  const local = [bairro, cidade, uf].filter(Boolean).join(' • ');
  if (local) parts.push(local);
  if (tipo) parts.push(`Tipologia: ${tipo}`);
  if (entrega) parts.push(`Entrega: ${entrega}`);
  if (unidadesDisponiveis) parts.push(`${unidadesDisponiveis} unidades disponiveis`);

  return parts.length ? parts.join(' | ') : null;
}

async function handleCheapestPriceFlow(
  user: User,
  context: ConversationContext
): Promise<FlowResult> {
  const response = await getEmpreendimentosCVCRM();
  const responseAny = response as any;
  const empreendimentos = Array.isArray(response)
    ? response
    : (responseAny.empreendimentos || responseAny.data || []);

  const empreendimentosById = new Map<string, any>();
  for (const emp of empreendimentos) {
    const id = String(emp.idempreendimento || emp.id);
    if (id) empreendimentosById.set(id, emp);
  }

  const unidadesResponse = await getUnidadesCVCRM();
  const unidadesRaw = Array.isArray(unidadesResponse)
    ? unidadesResponse
    : (unidadesResponse as any).data || (unidadesResponse as any).unidades || [];

  let cheapest: { valor: number; empId: string } | null = null;

  for (const u of unidadesRaw) {
    const empId = String(u.idempreendimento || "");
    if (!empId) continue;
    const valor = Number(u.valor_venda || u.valor_tabela || u.preco || 0);
    if (!valor) continue;
    const situacao = String(u.situacao || u.idunidadesituacao || "").toUpperCase();
    const isDisponivel = !["V", "VENDIDA", "VENDIDO", "R", "RESERVADA", "RESERVADO", "B", "BLOQUEADA"].includes(situacao);
    if (!isDisponivel) continue;

    if (!cheapest || valor < cheapest.valor) {
      cheapest = { valor, empId };
    }
  }

  if (!cheapest) {
    let cheapestEmp: { valor: number; empId: string } | null = null;
    for (const emp of empreendimentos) {
      const id = String(emp.idempreendimento || emp.id);
      const data = emp.cvcrm_data || emp;
      const precoMin = Number(data?.preco_minimo || data?.precoMinimo || 0);
      if (!id || !precoMin) continue;
      if (!cheapestEmp || precoMin < cheapestEmp.valor) {
        cheapestEmp = { valor: precoMin, empId: id };
      }
    }
    if (cheapestEmp) {
      cheapest = cheapestEmp;
    }
  }

  if (cheapest) {
    const emp = empreendimentosById.get(cheapest.empId);
    const nome = String(emp?.nome || emp?.empreendimento || 'Empreendimento');
    const empreendimentoDb = await getEmpreendimentoById(cheapest.empId, user.workspace_id);
    const snapshot = buildEmpreendimentoSnapshot(empreendimentoDb || emp);
    const url = buildEmpreendimentoLink(cheapest.empId, 'unidades');
    const textoBase = `Pelo nosso canal de parcerias, o mais em conta agora e o *${nome}* a partir de ${formatCurrency(cheapest.valor)}.`;
    const textoResumo = snapshot ? `Resumo rapido: ${snapshot}.` : null;
    const textoFechamento = 'Quer que eu ja registre o interesse e te mande tabela ou fotos?';
    const mensagemCompleta = [textoBase, textoResumo, textoFechamento].filter(Boolean).join('\n');

    await registerEmpreendimentoInteracao(
      user.id,
      { id: cheapest.empId, nome },
      'comparacao',
      mensagemCompleta,
      context,
      user.workspace_id
    );

    return {
      messages: [textoBase, ...(textoResumo ? [textoResumo] : []), textoFechamento],
      context,
      shouldUseAI: false,
      followUp: async (phone: string) => {
        await delay(300);
        await sendActionButtons(phone, 'Abrir no app', [
          { type: 'URL', label: 'Ver unidades', url },
        ]);
      },
    };
  }

  const link = buildEmpreendimentosListLink();
  return {
    messages: ['Nao encontrei valores disponiveis agora. Me diz bairro, quartos ou escolhe um empreendimento que eu ja te dou o preco certinho e registro aqui:'],
    context,
    shouldUseAI: false,
    followUp: async (phone: string) => {
      await delay(300);
      await sendActionButtons(phone, 'Abrir no app', [
        { type: 'URL', label: 'Abrir Empreendimentos', url: link },
      ]);
    },
  };
}

function normalizeAction(text: string): string {
  return text
    .replace(/[^a-zA-Z0-9À-ÿ\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function isAffirmative(text: string): boolean {
  const normalized = normalizeAction(text);
  return (
    normalized === 'sim' ||
    normalized === 's' ||
    normalized.includes('sim') ||
    normalized.includes('claro') ||
    normalized.includes('manda') ||
    normalized.includes('pode') ||
    normalized.includes('envia')
  );
}

async function startVoiceCall(user: User): Promise<string | null> {
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  const agentPhoneNumberId = process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID;
  if (!agentId || !agentPhoneNumberId) {
    return null;
  }

  const toNumber = normalizePhone(user.telefone);
  await createSipOutboundCall({
    agentId,
    agentPhoneNumberId,
    toNumber,
    metadata: {
      user_name: user.nome,
      user_role: user.role,
    },
  });

  return toNumber;
}

const EMPREENDIMENTO_STOPWORDS = new Set([
  'eu', 'u', 'quero', 'queria', 'gostaria', 'preciso', 'saber', 'saber do',
  'do', 'da', 'de', 'sobre', 'info', 'informacao', 'informacoes', 'me',
  'fala', 'falar', 'ver', 'ver do', 'o', 'a', 'um', 'uma', 'sobre o', 'sobre a',
  'empreendimento', 'imovel', 'imóveis', 'imoveis', 'apto', 'apartamento',
]);

function extractEmpreendimentoQuery(text: string): string | null {
  const normalized = normalizeAction(text);
  const tokens = normalized
    .split(' ')
    .filter((token) => token.length > 2 && !EMPREENDIMENTO_STOPWORDS.has(token));

  if (!tokens.length) return null;
  return tokens.join(' ').trim();
}

async function findEmpreendimentoByText(text: string, workspaceId?: number) {
  const query = extractEmpreendimentoQuery(text);
  if (!query) return null;

  const wsFilter = workspaceId ? ' and workspace_id = $2' : '';
  const wsParams = workspaceId ? [`%${query}%`, workspaceId] : [`%${query}%`];

  const { rows: directRows } = await dbQuery(
    `select cvcrm_id, nome, descricao, tipo, status, cidade, uf,
            data_entrega_prevista, total_unidades, cvcrm_data
     from cvcrm_empreendimentos
     where lower(nome) like $1${wsFilter}
     order by length(nome)
     limit 1`,
    wsParams
  );
  if (directRows[0]) return directRows[0];

  const tokens = query.split(' ').filter((token) => token.length > 2);
  if (!tokens.length) return null;

  const conditions: string[] = [];
  const values: (string | number)[] = [];
  let paramIdx = 1;
  tokens.forEach((token) => {
    conditions.push(`lower(nome) like $${paramIdx}`);
    values.push(`%${token}%`);
    paramIdx++;
  });
  if (workspaceId) {
    conditions.push(`workspace_id = $${paramIdx}`);
    values.push(workspaceId);
  }

  const { rows: tokenRows } = await dbQuery(
    `select cvcrm_id, nome, descricao, tipo, status, cidade, uf,
            data_entrega_prevista, total_unidades, cvcrm_data
     from cvcrm_empreendimentos
     where ${conditions.join(' and ')}
     order by length(nome)
     limit 1`,
    values
  );

  return tokenRows[0] || null;
}

async function findEmpreendimentoByRag(text: string, workspaceId?: number) {
  const results = await searchSimilar(text, {
    limit: 1,
    threshold: 0.6,
    sourceType: 'empreendimento',
  });

  const top = results[0];
  if (!top?.source_id) return null;

  const wsFilter = workspaceId ? ' and workspace_id = $2' : '';
  const wsParams = workspaceId ? [Number(top.source_id), workspaceId] : [Number(top.source_id)];

  const { rows } = await dbQuery(
    `select cvcrm_id, nome, descricao, tipo, status, cidade, uf,
            data_entrega_prevista, total_unidades, cvcrm_data
     from cvcrm_empreendimentos
     where cvcrm_id = $1${wsFilter}
     limit 1`,
    wsParams
  );
  return rows[0] || null;
}

async function getEmpreendimentoById(id: string, workspaceId?: number) {
  const wsFilter = workspaceId ? ' and workspace_id = $2' : '';
  const wsParams = workspaceId ? [Number(id), workspaceId] : [Number(id)];

  const { rows } = await dbQuery(
    `select cvcrm_id, nome, descricao, tipo, status, cidade, uf,
            data_entrega_prevista, total_unidades, cvcrm_data, endereco_completo
     from cvcrm_empreendimentos
     where cvcrm_id = $1${wsFilter}
     limit 1`,
    wsParams
  );
  return rows[0] || null;
}

function normalizeEmpreendimentoName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let _materiaisIndex: Record<string, any> | null = null;
function getMateriaisIndex(): Record<string, any> {
  if (_materiaisIndex) return _materiaisIndex;
  try {
    const filePath = path.resolve(process.cwd(), 'public/materiais/index.json');
    if (!fs.existsSync(filePath)) {
      _materiaisIndex = {};
      return _materiaisIndex;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    _materiaisIndex = JSON.parse(raw);
  } catch (error) {
    console.error('[Sofia] Erro ao carregar materiais:', error);
    _materiaisIndex = {};
  }
  return _materiaisIndex || {};
}

function findMateriaisByName(name: string) {
  const index = getMateriaisIndex();
  const target = normalizeEmpreendimentoName(name);
  let best: any = null;
  let bestScore = 0;
  for (const entry of Object.values(index)) {
    const entryName = String((entry as any).nome || '');
    const normalized = normalizeEmpreendimentoName(entryName);
    if (!normalized) continue;
    if (normalized === target) return entry;
    const score = target.split(' ').filter((t) => normalized.includes(t)).length;
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return best;
}

function normalizeUrl(url: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pratica.escreve.ai';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${baseUrl}${url}`;
  return `${baseUrl}/${url}`;
}

function extractImageUrls(data: any): string[] {
  const urls: string[] = [];
  const addUrl = (value?: string) => {
    if (!value || typeof value !== 'string') return;
    const cleaned = value.trim();
    if (!cleaned) return;
    urls.push(normalizeUrl(cleaned));
  };

  addUrl(data?.foto);
  addUrl(data?.foto_listagem);
  addUrl(data?.logo);

  const arrays = [data?.plantas_mapeadas, data?.plantas, data?.materiais_campanha];
  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (typeof item === 'string') {
        addUrl(item);
      } else if (item && typeof item === 'object') {
        addUrl(item.url);
        addUrl(item.arquivo);
        addUrl(item.foto);
        addUrl(item.imagem);
      }
    }
  }

  return Array.from(new Set(urls));
}

function getEmpreendimentoMedia(row: any): {
  images: string[];
  book?: { url: string; fileName: string };
} {
  const data = row.cvcrm_data || {};
  const images = extractImageUrls(data);
  let book: { url: string; fileName: string } | undefined;

  const materiais = findMateriaisByName(String(row.nome || ''));
  if (materiais?.materiais?.length) {
    for (const item of materiais.materiais) {
      if (item.tipo === 'book' && item.url && item.arquivo) {
        book = { url: normalizeUrl(item.url), fileName: item.nomeOriginal || item.arquivo };
      }
      if (['foto', 'imagem', 'render'].includes(item.tipo) && item.url) {
        images.push(normalizeUrl(item.url));
      }
    }
  }

  return {
    images: Array.from(new Set(images)),
    book,
  };
}

function buildEmpreendimentoLocation(row: any): {
  title: string;
  address: string;
  latitude: string;
  longitude: string;
} | null {
  const data = row.cvcrm_data || {};
  const latitude = data?.latitude;
  const longitude = data?.longitude;
  if (!latitude || !longitude) return null;

  const addressParts = [
    data?.endereco || row.endereco_completo || data?.endereco_emp,
    data?.bairro?.nome || data?.bairro,
    row.cidade || data?.cidade?.nome || data?.cidade,
    row.uf || data?.estado,
    data?.cep,
  ].filter(Boolean);

  const address = addressParts.join(', ');
  if (!address) return null;

  return {
    title: String(row.nome || 'Empreendimento'),
    address,
    latitude: String(latitude),
    longitude: String(longitude),
  };
}

function formatEmpreendimentoResumo(row: any): string {
  const data = row.cvcrm_data || {};
  const nome = String(row.nome || 'Empreendimento');
  const bairro = data?.bairro?.nome || data?.bairro || data?.bairro_nome;
  const cidade = row.cidade || data?.cidade?.nome || data?.cidade || data?.municipio;
  const uf = row.uf || data?.uf || data?.estado;
  const tipo = row.tipo || data?.tipo?.nome || data?.tipologia;
  const status = row.status || data?.status;
  const entregaRaw = row.data_entrega_prevista || data?.data_entrega || data?.previsao_entrega;
  const entrega = entregaRaw ? new Date(entregaRaw).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : null;
  const precoMin = data?.preco_minimo || data?.precoMinimo;
  const precoMax = data?.preco_maximo || data?.precoMaximo;
  const metragemMin = data?.metragem_min || data?.area_min || data?.area_privativa_min;
  const metragemMax = data?.metragem_max || data?.area_max || data?.area_privativa_max;
  const unidadesDisponiveis = data?.unidades_disponiveis || data?.unidadesDisponiveis || data?.disponiveis;

  const linhas: string[] = [];
  linhas.push(`Encontrei o *${nome}* e já separei um resumo pra você:`);
  const local = [bairro, cidade, uf].filter(Boolean).join(' • ');
  if (local) linhas.push(`• Localização: ${local}`);
  if (tipo) linhas.push(`• Tipologia: ${tipo}`);
  if (metragemMin || metragemMax) {
    const faixa = metragemMin && metragemMax ? `${metragemMin} a ${metragemMax} m²` : `${metragemMin || metragemMax} m²`;
    linhas.push(`• Metragens: ${faixa}`);
  }
  if (precoMin || precoMax) {
    const faixa = precoMin && precoMax
      ? `${formatCurrency(precoMin)} a ${formatCurrency(precoMax)}`
      : formatCurrency(precoMin || precoMax);
    linhas.push(`• Faixa de preço: ${faixa}`);
  }
  if (unidadesDisponiveis) {
    linhas.push(`• Unidades disponíveis: ${unidadesDisponiveis}`);
  }
  if (status) linhas.push(`• Status: ${status}`);
  if (entrega) linhas.push(`• Entrega: ${entrega}`);
  const highlight = extractEmpreendimentoHighlight(row);
  if (highlight) linhas.push(`• Destaque: ${highlight}`);

  return linhas.join('\n');
}

function extractEmpreendimentoHighlight(row: any): string | null {
  const data = row.cvcrm_data || {};
  const raw =
    data?.resumo ||
    data?.descricao ||
    data?.diferenciais ||
    data?.texto_empreendimento ||
    row.descricao ||
    row.resumo;
  if (!raw) return null;

  const cleaned = String(raw).replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.length > 180 ? `${cleaned.slice(0, 177)}...` : cleaned;
}

function buildEmpreendimentoHighlights(rows: any[], limit = 3): string | null {
  if (!rows.length) return null;
  const ranked = [...rows].sort((a, b) => {
    const aDisp = Number(a.unidades_disponiveis || a.cvcrm_data?.unidades_disponiveis || 0);
    const bDisp = Number(b.unidades_disponiveis || b.cvcrm_data?.unidades_disponiveis || 0);
    return bDisp - aDisp;
  });

  const picks = ranked.slice(0, limit).map((row) => {
    const data = row.cvcrm_data || {};
    const nome = String(row.nome || row.empreendimento || 'Empreendimento');
    const bairro = data?.bairro?.nome || row.bairro?.nome || row.bairro || data?.bairro_nome;
    const cidade = row.cidade || data?.cidade?.nome || data?.cidade;
    const precoMin = data?.preco_minimo || data?.precoMinimo;
    const disponiveis = Number(row.unidades_disponiveis || data?.unidades_disponiveis || 0);
    const local = bairro || cidade;
    const parts = [nome];
    if (local) parts.push(local);
    if (precoMin) parts.push(`a partir de ${formatCurrency(precoMin)}`);
    if (disponiveis) parts.push(`${disponiveis} disp.`);
    return `• ${parts.join(' • ')}`;
  });

  return `Destaques com mais saida agora:\n${picks.join('\n')}`;
}

function formatLeadInsights(payload: {
  leads: Array<{
    nome: string;
    situacao_nome?: string;
    origem?: string;
    data_cadastro_cvcrm?: string;
  }>;
  total: number;
  resumo: Record<string, number>;
}): string[] {
  const messages: string[] = [];
  if (!payload.total) return messages;

  const statusResumo = Object.entries(payload.resumo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([status, count]) => `${status} (${count})`);

  const leadLines = payload.leads.slice(0, 3).map((lead) => {
    const parts = [lead.nome];
    if (lead.situacao_nome) parts.push(lead.situacao_nome);
    if (lead.origem) parts.push(lead.origem);
    if (lead.data_cadastro_cvcrm) {
      const date = new Date(lead.data_cadastro_cvcrm);
      if (!Number.isNaN(date.getTime())) {
        parts.push(date.toLocaleDateString('pt-BR'));
      }
    }
    return `• ${parts.join(' • ')}`;
  });

  const resumoText = statusResumo.length ? `Top status: ${statusResumo.join(', ')}.` : '';
  messages.push(`Resumo rapido dos seus leads: ${payload.total} ativos. ${resumoText}`.trim());
  if (leadLines.length) {
    messages.push(`Aquecendo agora:\n${leadLines.join('\n')}`);
  }
  messages.push('Quer que eu priorize 3 contatos e já monte a primeira mensagem?');

  return messages;
}

// ============================================
// FLUXO: ONBOARDING
// ============================================

export async function handleOnboarding(
  newPhone: string,
  newName: string,
  sender: User
): Promise<void> {
  const imobName = sender.imobiliarias?.nome || 'Pratica';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pratica.escreve.ai';

  // Sequência de onboarding com delays psicológicos
  const messages = [
    ONBOARDING.acolhimento(newName),
    ONBOARDING.apresentacao(),
    ONBOARDING.contexto(sender.nome, imobName),
    ONBOARDING.proposta(),
    ONBOARDING.cta(appUrl),
  ];

  // Enviar com delays
  for (let i = 0; i < messages.length; i++) {
    if (i > 0) {
      // Delays específicos por fase
      const delays = [1000, 1500, 2000, 1500];
      await delay(delays[i - 1] || 1000);
    }
    await sendTextMessage(newPhone, messages[i]);
  }
}

// ============================================
// FLUXO: SAUDAÇÃO
// ============================================

async function handleGreeting(
  user: User,
  context: ConversationContext,
  agentConfig?: AgentConfig
): Promise<FlowResult> {
  const messages: string[] = [];
  const actions: Array<{ id: string; emoji?: string; label: string }> = [];
  const actionIds = new Set<string>();

  const addAction = (id: string, emoji: string, label: string) => {
    if (actionIds.has(id) || actions.length >= 3) return;
    actions.push({ id, emoji, label });
    actionIds.add(id);
  };

  // Verificar se é retorno ou primeira vez
  if (context.topics_discussed.length > 0) {
    messages.push(SAUDACOES.oiRetorno(user.nome));
  } else {
    // Se agentConfig tem greetingMessage customizado, usar ele
    if (agentConfig?.greetingMessage) {
      // Substituir placeholders no greetingMessage
      const greeting = agentConfig.greetingMessage
        .replace(/\{nome\}/gi, user.nome)
        .replace(/\{usuario\}/gi, user.nome);
      messages.push(greeting);
    } else if (user.imobiliarias?.nome) {
      messages.push(SAUDACOES.comImobiliaria(user.nome, user.imobiliarias.nome));
    } else {
      messages.push(getSaudacaoHorario(user.nome));
    }
  }

  let recentPages: string[] = [];
  try {
    const wsFilter = user.workspace_id ? ' and workspace_id = $2' : '';
    const wsParams = user.workspace_id ? [user.id, user.workspace_id] : [user.id];
    const { rows: activities } = await dbQuery(
      `select page
       from tracking_events
       where user_id = $1${wsFilter}
       order by created_at desc
       limit 6`,
      wsParams
    );
    recentPages = activities.map((row) => String(row.page || "").toLowerCase());
  } catch (error) {
    console.error("[Sofia] Erro ao carregar atividades recentes:", error);
  }

  const persona = await getPersonaByUser(user);

  if (user.role === "gerente" || user.role === "admin") {
    addAction("ranking", "🏆", "Ranking equipe");
    addAction("metas", "🎯", "Metas do mês");
    addAction("campanha", "📣", "Campanhas");
  } else {
    for (const page of recentPages) {
      if (page.includes("corretor-propostas")) {
        addAction("propostas", "📌", "Status propostas");
      }
      if (page.includes("corretor-imoveis") || page.includes("empreendimentos")) {
        addAction("buscar", "🔎", "Buscar imóvel");
      }
      if (page.includes("corretor-clientes") || page.includes("leads")) {
        addAction("simular", "💰", "Simular cliente");
      }
      if (page.includes("corretor-mensagens")) {
        addAction("objecao", "🧠", "Argumentos/objeções");
      }
      if (page.includes("corretor-relatorios")) {
        addAction("comissao", "💵", "Comissões");
      }
      if (page.includes("corretor-salva-leads")) {
        addAction("agenda", "📅", "Agenda");
      }
    if (actions.length >= 3) break;
    }

    if (persona.perfil === "corretor_junior") {
      addAction("objecao", "🧠", "Argumentos/objeções");
    }

    addAction("buscar", "🔎", "Buscar imóvel");
    addAction("simular", "💰", "Simular cliente");
    addAction("tabela", "📊", "Materiais/tabela");
  }

  if (user.role === "corretor" && user.workspace_id) {
    try {
      const corretorId = await getCorretorIdByUserId(user.id);
      if (corretorId) {
        const leadsPayload = await getLeadsByCorretor(String(corretorId), user.workspace_id, {
          limit: 3,
          periodo: "semana",
        });
        const leadMessages = formatLeadInsights(leadsPayload);
        messages.push(...leadMessages);
      }
    } catch (error) {
      console.error("[Sofia] Erro ao carregar insights de leads:", error);
    }
  }

  if (recentPages.length > 0 && user.role === "corretor") {
    const recent = recentPages[0] || "";
    if (recent.includes("corretor-propostas")) {
      messages.push("Quer que eu puxe o status das suas propostas e já te diga o próximo passo?");
    } else if (recent.includes("corretor-imoveis") || recent.includes("empreendimentos")) {
      messages.push("Quer que eu já te indique 3 opções quentes pra fechar mais rápido?");
    } else if (recent.includes("corretor-clientes") || recent.includes("leads")) {
      messages.push("Quer que eu sugira o melhor próximo contato pra destravar venda?");
    } else if (recent.includes("corretor-mensagens")) {
      messages.push("Quer que eu te ajude a responder as objeções que chegaram?");
    } else if (recent.includes("corretor-relatorios")) {
      messages.push("Quer que eu destaque as comissões pendentes e o que dá pra acelerar?");
    } else if (recent.includes("corretor-salva-leads")) {
      messages.push("Quer que eu organize seus próximos follow-ups do salva leads?");
    }
  }

  return {
    messages,
    context: updateContext(context, {
      topic: 'saudacao',
    }),
    shouldUseAI: false,
    // Enviar menu de ações após saudação
    followUp: async (phone: string) => {
      await delay(1000);
      await askAction(phone, 'Como posso te ajudar agora?', actions);
    },
  };
}

// ============================================
// FLUXO: BUSCA DE IMÓVEIS
// ============================================

async function handleSearchFlow(
  user: User,
  text: string,
  context: ConversationContext
): Promise<FlowResult> {
  const intent = detectIntent(text);
  const messages: string[] = [];
  const action = normalizeAction(text);

  if (context.awaiting_response === 'escolha_empreendimento') {
    const selection = text.trim();
    const empId =
      selection.toLowerCase().startsWith('emp_') ? selection.slice(4) : null;

    const response = await getEmpreendimentosCVCRM();
    const responseAny = response as any;
    const empreendimentos = Array.isArray(response)
      ? response
      : (responseAny.empreendimentos || responseAny.data || []);

    const matched = empId
      ? empreendimentos.find((emp: any) =>
          String(emp.idempreendimento || emp.id) === empId
        )
      : empreendimentos.find((emp: any) => {
          const nome = String(emp.nome || emp.empreendimento || '');
          return nome && selection.toLowerCase().includes(nome.toLowerCase());
        });

    if (matched) {
      const nome = String(matched.nome || matched.empreendimento || 'Empreendimento');
      const empreendimentoId = String(matched.idempreendimento || matched.id);
      const messages = [
        `Perfeito, ${nome}! Quer tabela, unidades, simulacao ou material?`,
      ];
      return {
        messages,
        context: updateContext(context, {
          flow: 'search',
          step: 2,
          awaiting: null,
          entities: { empreendimento: empreendimentoId },
        }),
        shouldUseAI: false,
        followUp: async (phone: string) => {
          await delay(400);
          await askAction(phone, 'Escolhe o próximo passo:', [
            { id: 'tabela', emoji: '📊', label: 'Tabela' },
            { id: 'unidades', emoji: '🏢', label: 'Unidades' },
            { id: 'material', emoji: '📎', label: 'Material' },
            { id: 'simular', emoji: '💰', label: 'Simular' },
          ]);
        },
      };
    }
  }

  if (context.current_flow === 'search' && context.entities.empreendimento) {
    const empreendimentoId = String(context.entities.empreendimento);
    if (action.includes('foto') || action.includes('fotos') || action.includes('imagem')) {
      const empreendimento = await getEmpreendimentoById(empreendimentoId, user.workspace_id);
      if (empreendimento) {
        const messages = [`Perfeito, vou te mandar as fotos do *${empreendimento.nome}* agora.`];
        return {
          messages,
          context: updateContext(context, { awaiting: null }),
          shouldUseAI: false,
          followUp: async (phone: string) => {
            const media = getEmpreendimentoMedia(empreendimento);
            if (media.images.length > 0) {
              const images = media.images.slice(0, 3);
              for (let i = 0; i < images.length; i += 1) {
                await sendImage(phone, images[i], i === 0 ? `📸 *${empreendimento.nome}*` : undefined);
                await delay(500);
              }
            } else if (media.book) {
              await sendDocument(phone, media.book.url, media.book.fileName, `📘 *${empreendimento.nome}* - Book completo`);
            } else {
              await sendTextMessage(phone, 'Ainda nao tenho fotos cadastradas desse empreendimento.');
            }
          },
        };
      }
    }

    if (action.includes('tabela') || action.includes('unidades')) {
      const url = buildEmpreendimentoLink(empreendimentoId, 'unidades');
      const empreendimento = await getEmpreendimentoById(empreendimentoId, user.workspace_id);
      const nome = String(empreendimento?.nome || 'Empreendimento');
      const messages = ['Seguindo com tabela/unidades:'];
      await registerEmpreendimentoInteracao(
        user.id,
        { id: empreendimentoId, nome },
        'unidade',
        `${messages[0]}\n${url}`,
        context,
        user.workspace_id
      );
      return {
        messages,
        context,
        shouldUseAI: false,
        followUp: async (phone: string) => {
          await delay(300);
          await sendActionButtons(phone, 'Abrir no app', [
            { type: 'URL', label: 'Abrir Tabela', url },
          ]);
        },
      };
    }

    if (action.includes('simular')) {
      const url = buildEmpreendimentoLink(empreendimentoId, 'simular');
      const empreendimento = await getEmpreendimentoById(empreendimentoId, user.workspace_id);
      const nome = String(empreendimento?.nome || 'Empreendimento');
      const messages = ['Posso te ajudar a simular agora:'];
      await registerEmpreendimentoInteracao(
        user.id,
        { id: empreendimentoId, nome },
        'simulacao',
        `${messages[0]}\n${url}`,
        context,
        user.workspace_id
      );
      return {
        messages,
        context,
        shouldUseAI: false,
        followUp: async (phone: string) => {
          await delay(300);
          await sendActionButtons(phone, 'Abrir no app', [
            { type: 'URL', label: 'Abrir Simulacao', url },
          ]);
        },
      };
    }

    if (action.includes('material')) {
      const url = buildEmpreendimentoLink(empreendimentoId, 'sobre');
      const empreendimento = await getEmpreendimentoById(empreendimentoId, user.workspace_id);
      const nome = String(empreendimento?.nome || 'Empreendimento');
      const messages = ['Ja separei o material do empreendimento:'];
      await registerEmpreendimentoInteracao(
        user.id,
        { id: empreendimentoId, nome },
        'book',
        `${messages[0]}\n${url}`,
        context,
        user.workspace_id
      );
      return {
        messages,
        context,
        shouldUseAI: false,
        followUp: async (phone: string) => {
          await delay(300);
          await sendActionButtons(phone, 'Abrir no app', [
            { type: 'URL', label: 'Abrir Empreendimento', url },
          ]);
        },
      };
    }
  }

  // Início do fluxo - mostrar menu de empreendimentos direto
  if (context.current_flow !== 'search') {
    const response = await getEmpreendimentosCVCRM();
    const responseAny = response as any;
    const empreendimentos = Array.isArray(response)
      ? response
      : (responseAny.empreendimentos || responseAny.data || []);

    if (empreendimentos.length > 0) {
      const total = empreendimentos.length;
      messages.push(`No canal de parcerias, tenho ${total} empreendimentos ativos hoje.`);
      messages.push('Me diz bairro, quartos ou faixa de preco e eu te devolvo as 3 melhores opcoes.');
      const highlights = buildEmpreendimentoHighlights(empreendimentos);
      if (highlights) {
        messages.push(highlights);
      }
      messages.push('Se preferir, escolhe direto no menu abaixo e eu ja registro a consulta:');

      const byBairro = new Map<string, Array<{ id: string; nome: string; disponiveis: number }>>();
      for (const emp of empreendimentos) {
        const bairro = String(emp.bairro?.nome || emp.bairro || emp.bairro_nome || 'Sem bairro');
        const item = {
          id: String(emp.idempreendimento || emp.id),
          nome: String(emp.nome || emp.empreendimento || 'Empreendimento'),
          disponiveis: Number(emp.unidades_disponiveis || 0),
        };
        const list = byBairro.get(bairro) || [];
        list.push(item);
        byBairro.set(bairro, list);
      }

      const sections = Array.from(byBairro.entries())
        .map(([bairro, list]) => ({
          bairro,
          empreendimentos: list.sort((a, b) => a.nome.localeCompare(b.nome)),
        }))
        .sort((a, b) => a.bairro.localeCompare(b.bairro));

      return {
        messages,
        context: updateContext(context, {
          flow: 'search',
          step: 1,
          awaiting: 'escolha_empreendimento',
          topic: 'busca_imovel',
        }),
        shouldUseAI: false,
        // Enviar menu de empreendimentos
        followUp: async (phone: string) => {
          await delay(500);
          await sendBairrosMenu(phone, sections);
        },
      };
    } else {
      messages.push(BUSCA.semResultados());
      return {
        messages,
        context: updateContext(context, { flow: null }),
        shouldUseAI: false,
      };
    }
  }

  // Se tem filtros na mensagem, buscar com filtros
  if (intent.entities.quartos || intent.entities.valor) {
    messages.push('Boa, vou filtrar pra voce.');

    // Buscar empreendimentos no banco
    const response = await getEmpreendimentosCVCRM();
    const responseAny = response as any;
    const empreendimentos = Array.isArray(response)
      ? response
      : (responseAny.empreendimentos || responseAny.data || []);

    if (empreendimentos.length > 0) {
      const unidadesResponse = await getUnidadesCVCRM();
      const unidadesRaw = Array.isArray(unidadesResponse)
        ? unidadesResponse
        : (unidadesResponse as any).data || (unidadesResponse as any).unidades || [];

      const maxValor = intent.entities.valor;
      const quartos = intent.entities.quartos;
      const disponiveisPorEmp = new Map<string, number>();

      for (const u of unidadesRaw) {
        const empId = String(u.idempreendimento || "");
        if (!empId) continue;

        const valor = Number(u.valor_venda || u.valor_tabela || u.preco || 0);
        const qtdQuartos = Number(u.quartos || 0);
        const situacao = String(u.situacao || u.idunidadesituacao || "").toUpperCase();
        const isDisponivel = !["V", "VENDIDA", "VENDIDO", "R", "RESERVADA", "RESERVADO", "B", "BLOQUEADA"].includes(situacao);

        if (!isDisponivel) continue;
        if (maxValor && valor > maxValor) continue;
        if (quartos && qtdQuartos !== quartos) continue;

        disponiveisPorEmp.set(empId, (disponiveisPorEmp.get(empId) || 0) + 1);
      }

      const byBairro = new Map<string, Array<{ id: string; nome: string; disponiveis: number }>>();
      for (const emp of empreendimentos) {
        const id = String(emp.idempreendimento || emp.id);
        const disponiveis = disponiveisPorEmp.get(id) || 0;
        if (disponiveis === 0) continue;
        const bairro = String(emp.bairro?.nome || emp.bairro || emp.bairro_nome || 'Sem bairro');
        const list = byBairro.get(bairro) || [];
        list.push({
          id,
          nome: String(emp.nome || emp.empreendimento || 'Empreendimento'),
          disponiveis,
        });
        byBairro.set(bairro, list);
      }

      const sections = Array.from(byBairro.entries())
        .map(([bairro, list]) => ({
          bairro,
          empreendimentos: list.sort((a, b) => a.nome.localeCompare(b.nome)),
        }))
        .sort((a, b) => a.bairro.localeCompare(b.bairro));

      if (sections.length === 0) {
        messages.push(BUSCA.semResultados());
        return {
          messages,
          context: updateContext(context, {
            flow: 'search',
            step: 2,
            entities: intent.entities,
            awaiting: null,
          }),
          shouldUseAI: false,
        };
      }

      const totalMatches = sections.reduce((sum, section) => sum + section.empreendimentos.length, 0);
      const filters: string[] = [];
      if (quartos) filters.push(`${quartos} dorm`);
      if (maxValor) filters.push(`ate ${formatCurrency(maxValor)}`);
      if (filters.length) {
        messages.push(`Encontrei ${totalMatches} empreendimentos que batem com ${filters.join(' e ')}.`);
      } else {
        messages.push(`Encontrei ${totalMatches} empreendimentos que batem com seus filtros.`);
      }
      messages.push('Quer refinar por bairro ou ja escolhe no menu?');

      return {
        messages,
        context: updateContext(context, {
          flow: 'search',
          step: 2,
          entities: intent.entities,
          awaiting: 'escolha_empreendimento',
        }),
        shouldUseAI: false,
        followUp: async (phone: string) => {
          await delay(500);
          await sendBairrosMenu(phone, sections);
        },
      };
    } else {
      messages.push(BUSCA.semResultados());
    }

    return {
      messages,
      context: updateContext(context, {
        flow: 'search',
        step: 2,
        entities: intent.entities,
        awaiting: 'escolha_empreendimento',
      }),
      shouldUseAI: false,
    };
  }

  // Pedir filtros se não tem
  messages.push(BUSCA.filtros());
  return {
    messages,
    context: updateContext(context, {
      awaiting: 'filtros',
    }),
    shouldUseAI: false,
  };
}

// ============================================
// FLUXO: SIMULAÇÃO
// ============================================

async function handleSimulationFlow(
  user: User,
  text: string,
  context: ConversationContext
): Promise<FlowResult> {
  const intent = detectIntent(text);
  const messages: string[] = [];

  // Início do fluxo
  if (context.current_flow !== 'simulate') {
    messages.push('No canal de parcerias, eu simulo e ja registro tudo aqui. Bora simular! 💰');

    // Se já tem valor na mensagem, mostrar botões de entrada
    if (intent.entities.valor) {
      const valor = intent.entities.valor;
      return {
        messages,
        context: updateContext(context, {
          flow: 'simulate',
          step: 2,
          entities: { valor },
          awaiting: 'entrada',
          topic: 'simulacao',
        }),
        shouldUseAI: false,
        followUp: async (phone: string) => {
          await delay(500);
          await askEntrada(phone, valor);
        },
      };
    }

    messages.push(SIMULACAO.qualValor());
    return {
      messages,
      context: updateContext(context, {
        flow: 'simulate',
        step: 1,
        awaiting: 'valor',
        topic: 'simulacao',
      }),
      shouldUseAI: false,
    };
  }

  // Esperando valor
  if (context.awaiting_response === 'valor') {
    if (intent.entities.valor) {
      const valor = intent.entities.valor;
      return {
        messages: [],
        context: updateContext(context, {
          step: 2,
          entities: { valor },
          awaiting: 'entrada',
        }),
        shouldUseAI: false,
        followUp: async (phone: string) => {
          await askEntrada(phone, valor);
        },
      };
    }
    messages.push(SIMULACAO.valorInvalido());
    return { messages, context, shouldUseAI: false };
  }

  // Processar escolha de botão de entrada
  const entradaMatch = text.match(/entrada_(\d+)/i);
  if (entradaMatch) {
    const percentual = parseInt(entradaMatch[1]);
    const valor = context.entities.valor || 400000;
    const entrada = valor * (percentual / 100);
    const prazo = 360;

    // Usar calculadora CEF
    const { simularFinanciamentoCaixa, CONFIGURACAO_CAIXA_SBPE } = await import('@/lib/financial-calculations-caixa');
    
    try {
      const simulacao = simularFinanciamentoCaixa(
        valor,
        entrada,
        prazo,
        CONFIGURACAO_CAIXA_SBPE,
        0,
        'outros'
      );

      const p1 = simulacao.price.primeiraParcela;
      const seguros = p1.mipMensal + p1.dfiMensal;
      
      messages.push(SIMULACAO.resultadoCEF());
      messages.push(
        SIMULACAO.detalhesCEF({
          entrada: simulacao.valorEntrada,
          percentualEntrada: percentual,
          valorFinanciado: simulacao.valorFinanciado,
          parcelaTotal: p1.parcelaTotal,
          parcelaBase: p1.parcelaBase,
          seguros: seguros,
          tarifas: p1.tarifaAdministracao,
          prazo: simulacao.prazoMeses,
          taxaNominal: simulacao.taxaNominalAnual,
          cetAnual: simulacao.price.cetAnual,
          rendaMinima: simulacao.viabilidade.rendaMinimaPrice,
        })
      );
      
      await delay(800);
      messages.push(SIMULACAO.explicaCET());

      await registrarAtividade(
        user.id,
        'Simulacao via WhatsApp',
        buildSimulacaoRegistro({
          valor,
          entrada,
          percentual,
          prazo,
          parcelaTotal: p1.parcelaTotal,
          cetAnual: simulacao.price.cetAnual,
          rendaMinima: simulacao.viabilidade.rendaMinimaPrice,
          nomeCliente: context.entities.nomeCliente,
        })
      );

      return {
        messages,
        context: updateContext(context, {
          step: 3,
          entities: { 
            entrada, 
            percentual,
            simulacaoCEF: {
              parcelaTotal: p1.parcelaTotal,
              cetAnual: simulacao.price.cetAnual,
              rendaMinima: simulacao.viabilidade.rendaMinimaPrice,
            }
          },
          awaiting: 'proximo_passo',
        }),
        shouldUseAI: false,
        followUp: async (phone: string) => {
          await delay(1500);
          await askPostSimulacao(phone);
        },
      };
    } catch (error) {
      console.error('Erro ao calcular CEF:', error);
      // Fallback para cálculo simples
      const valorFinanciado = valor - entrada;
      const taxaMensal = 0.00833;
      const parcela =
        (valorFinanciado * taxaMensal * Math.pow(1 + taxaMensal, prazo)) /
        (Math.pow(1 + taxaMensal, prazo) - 1);

      messages.push(SIMULACAO.resultado());
      messages.push(
        SIMULACAO.detalhes({
          entrada,
          percentualEntrada: percentual,
          parcela: Math.round(parcela),
          prazo,
          taxa: 10,
        })
      );

      await registrarAtividade(
        user.id,
        'Simulacao via WhatsApp',
        buildSimulacaoRegistro({
          valor,
          entrada,
          percentual,
          prazo,
          parcela: Math.round(parcela),
          nomeCliente: context.entities.nomeCliente,
        })
      );

      return {
        messages,
        context: updateContext(context, {
          step: 3,
          entities: { entrada, percentual },
          awaiting: 'proximo_passo',
        }),
        shouldUseAI: false,
        followUp: async (phone: string) => {
          await delay(1500);
          await askPostSimulacao(phone);
        },
      };
    }
  }

  // Esperando entrada - calcular simulação
  if (context.awaiting_response === 'entrada') {
    const valor = context.entities.valor || 400000;
    let entrada: number;
    let percentual: number;

    if (intent.entities.percentual) {
      percentual = intent.entities.percentual;
      entrada = valor * (percentual / 100);
    } else if (intent.entities.entrada) {
      entrada = intent.entities.entrada;
      percentual = Math.round((entrada / valor) * 100);
    } else {
      // Padrão 20%
      percentual = 20;
      entrada = valor * 0.2;
    }

    const prazo = intent.entities.prazo || 360;

    // Usar calculadora CEF
    const { simularFinanciamentoCaixa, CONFIGURACAO_CAIXA_SBPE } = await import('@/lib/financial-calculations-caixa');
    
    try {
      const simulacao = simularFinanciamentoCaixa(
        valor,
        entrada,
        prazo,
        CONFIGURACAO_CAIXA_SBPE,
        0,
        'outros'
      );

      const p1 = simulacao.price.primeiraParcela;
      const seguros = p1.mipMensal + p1.dfiMensal;
      
      messages.push(SIMULACAO.resultadoCEF());
      messages.push(
        SIMULACAO.detalhesCEF({
          entrada: simulacao.valorEntrada,
          percentualEntrada: percentual,
          valorFinanciado: simulacao.valorFinanciado,
          parcelaTotal: p1.parcelaTotal,
          parcelaBase: p1.parcelaBase,
          seguros: seguros,
          tarifas: p1.tarifaAdministracao,
          prazo: simulacao.prazoMeses,
          taxaNominal: simulacao.taxaNominalAnual,
          cetAnual: simulacao.price.cetAnual,
          rendaMinima: simulacao.viabilidade.rendaMinimaPrice,
        })
      );
      
      await delay(800);
      messages.push(SIMULACAO.explicaCET());

      await registrarAtividade(
        user.id,
        'Simulacao via WhatsApp',
        buildSimulacaoRegistro({
          valor,
          entrada,
          percentual,
          prazo: simulacao.prazoMeses,
          parcelaTotal: p1.parcelaTotal,
          cetAnual: simulacao.price.cetAnual,
          rendaMinima: simulacao.viabilidade.rendaMinimaPrice,
          nomeCliente: context.entities.nomeCliente,
        })
      );

      return {
        messages,
        context: updateContext(context, {
          step: 3,
          entities: {
            entrada,
            percentual,
            simulacaoCEF: {
              parcelaTotal: p1.parcelaTotal,
              cetAnual: simulacao.price.cetAnual,
              rendaMinima: simulacao.viabilidade.rendaMinimaPrice,
            }
          },
          awaiting: 'proximo_passo',
        }),
        shouldUseAI: false,
        followUp: async (phone: string) => {
          await delay(1500);
          await askPostSimulacao(phone);
        },
      };
    } catch (error) {
      console.error('Erro ao calcular CEF:', error);
      // Fallback para cálculo simples
      const valorFinanciado = valor - entrada;
      const taxaMensal = 0.00833; // ~10% ao ano
      const parcela =
        (valorFinanciado * taxaMensal * Math.pow(1 + taxaMensal, prazo)) /
        (Math.pow(1 + taxaMensal, prazo) - 1);

      messages.push(SIMULACAO.resultado());
      messages.push(
        SIMULACAO.detalhes({
          entrada,
          percentualEntrada: percentual,
          parcela: Math.round(parcela),
          prazo,
          taxa: 10,
        })
      );
      messages.push(SIMULACAO.comparacao(parcela));

      await registrarAtividade(
        user.id,
        'Simulacao via WhatsApp',
        buildSimulacaoRegistro({
          valor,
          entrada,
          percentual,
          prazo,
          parcela: Math.round(parcela),
          nomeCliente: context.entities.nomeCliente,
        })
      );

      return {
        messages,
        context: updateContext(context, {
          step: 3,
          entities: {
            entrada,
            percentual,
          },
          awaiting: 'proximo_passo',
        }),
        shouldUseAI: false,
        followUp: async (phone: string) => {
          await delay(1500);
          await askPostSimulacao(phone);
        },
      };
    }
  }

  // Processar escolha de botão pós-simulação
  if (text.includes('outra_entrada')) {
    const valor = context.entities.valor || 400000;
    return {
      messages: [],
      context: updateContext(context, {
        step: 2,
        awaiting: 'entrada',
      }),
      shouldUseAI: false,
      followUp: async (phone: string) => {
        await askEntrada(phone, valor);
      },
    };
  }

  // Comparação com outra entrada
  if (intent.intent === 'simulate_compare') {
    const valor = context.entities.valor || 400000;
    return {
      messages: [],
      context: updateContext(context, {
        step: 2,
        awaiting: 'entrada',
      }),
      shouldUseAI: false,
      followUp: async (phone: string) => {
        await askEntrada(phone, valor);
      },
    };
  }

  return { messages: [], context, shouldUseAI: true };
}

// ============================================
// FLUXO: SUPORTE
// ============================================

async function handleSupportFlow(
  user: User,
  text: string,
  context: ConversationContext,
  sentiment: Sentiment
): Promise<FlowResult> {
  const messages: string[] = [];

  // Verificar se quer falar com humano
  if (isHumanRequest(text)) {
    // Buscar gerente do corretor
    let gerenteNome = 'o time de suporte';

    if (user.gerente_id) {
      const { rows } = await dbQuery(
        `select nome, telefone from users where id = $1 limit 1`,
        [user.gerente_id]
      );
      const gerente = rows[0];

      if (gerente) {
        gerenteNome = gerente.nome;

        // Notificar gerente
        await sendTextMessage(
          normalizePhone(gerente.telefone),
          `⚠️ *Escalação*\n\nO corretor ${user.nome} pediu para falar com você.\n\nÚltima mensagem: "${text}"\n\nTelefone: ${user.telefone}`
        );
      }
    }

    messages.push(SUPORTE.escalando(gerenteNome));

    await registrarAtividade(
      user.id,
      'Solicitou suporte via WhatsApp',
      `Solicitou falar com humano. Ultima mensagem: "${text}".`,
      { activityType: 'support' }
    );

    return {
      messages,
      context: escalateContext(context, gerenteNome),
      shouldUseAI: false,
    };
  }

  // Empatia primeiro se sentimento negativo
  if (sentiment === 'negative') {
    messages.push(SUPORTE.desculpa());
    messages.push(`${SUPORTE.meContaOQueFoi()} Eu ja registro aqui pra agilizar.`);
  } else {
    messages.push(`${SUPORTE.qualErro()} Vou registrar no sistema assim que voce me explicar.`);
  }

  await registrarAtividade(
    user.id,
    'Suporte iniciado via WhatsApp',
    `Sentimento: ${sentiment}. Mensagem: "${text}".`,
    { activityType: 'support' }
  );

  return {
    messages,
    context: updateContext(context, {
      flow: 'support',
      awaiting: 'descricao_problema',
      topic: 'suporte',
    }),
    shouldUseAI: false,
  };
}

// ============================================
// FLUXO: FEEDBACK
// ============================================

function handleFeedback(
  user: User,
  text: string,
  context: ConversationContext,
  sentiment: Sentiment
): FlowResult {
  const messages: string[] = [];

  if (sentiment === 'positive') {
    messages.push(FEEDBACK.deNada(user.nome));
    messages.push(FEEDBACK.queBom());
  } else if (sentiment === 'negative') {
    messages.push(FEEDBACK.desculpaErro());
    messages.push(FEEDBACK.oQueEsperava());
  }

  return {
    messages,
    context: updateContext(context, {
      flow: null,
      awaiting: null,
    }),
    shouldUseAI: messages.length === 0,
  };
}

// ============================================
// FLUXO: METAS E PERFORMANCE
// ============================================

async function handleMetasFlow(
  user: User,
  text: string,
  context: ConversationContext
): Promise<FlowResult> {
  const messages: string[] = [];
  const intent = detectIntent(text);

  // Obter o ID do corretor no CVCRM
  const corretorId = await getCorretorIdByUserId(user.id);

  if (!corretorId) {
    messages.push('Ainda nao encontrei seus dados no sistema de metas. Fala com seu gerente pra verificar o cadastro.');
    return {
      messages,
      context: updateContext(context, { flow: null }),
      shouldUseAI: false,
    };
  }

  // Se pedir ranking especificamente
  if (intent.intent === 'metas_ranking') {
    try {
      const rankingData = await getRankingEquipe(user.workspace_id || 1, {
        limite: 10,
        periodo: 'mes',
        imobiliariaId: user.imobiliaria_id ? parseInt(user.imobiliaria_id, 10) : undefined,
      });

      // Encontrar posição do corretor atual
      const minhaPosition = rankingData.ranking.findIndex(
        (r) => r.corretor_id === corretorId
      );
      const posicao = minhaPosition >= 0 ? minhaPosition + 1 : rankingData.ranking.length + 1;

      const topCorretores = rankingData.ranking.slice(0, 3).map((r) => ({
        nome: r.corretor_nome.split(' ')[0], // Primeiro nome apenas
        percentual: r.total_vendas,
      }));

      messages.push(
        METAS.ranking({
          posicao,
          totalCorretores: rankingData.ranking.length || 10,
          topCorretores,
        })
      );

      // Mensagem motivacional baseada na posição
      if (posicao <= 3) {
        messages.push('Voce ta no top 3! Continua assim que o mes e seu! 🔥');
      } else if (posicao <= 5) {
        messages.push('Ta pertinho do top! Uma venda a mais e voce sobe no ranking! 💪');
      } else {
        messages.push('Bora acelerar? Posso te mostrar os imoveis com mais saida esse mes!');
      }

      return {
        messages,
        context: updateContext(context, {
          flow: 'metas',
          topic: 'ranking',
        }),
        shouldUseAI: false,
      };
    } catch (error) {
      console.error('Erro ao buscar ranking:', error);
      messages.push('Tive um problema ao buscar o ranking. Tenta de novo daqui a pouco?');
      return {
        messages,
        context,
        shouldUseAI: false,
      };
    }
  }

  // Buscar metas e progresso
  try {
    const metasData = await getMetasCorretor(String(corretorId), user.workspace_id || 1);
    const { metas, resumo } = metasData;

    // Calcular percentual geral e dias restantes no mes
    const hoje = new Date();
    const fimDoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    const diasRestantes = Math.max(0, fimDoMes.getDate() - hoje.getDate());

    // Encontrar meta principal (vendas_valor)
    const metaVendas = metas.find((m) => m.tipo === 'vendas_valor');
    const metaQuantidade = metas.find((m) => m.tipo === 'vendas_quantidade');

    const percentualAtingido = resumo.percentual_geral;
    const metaValor = metaVendas?.meta_valor || 500000;
    const realizado = metaVendas?.valor_atual || 0;
    const faltam = Math.max(0, metaValor - realizado);

    // Determinar mensagem baseada no percentual
    if (percentualAtingido >= 90) {
      // Mensagem motivacional positiva - quase la ou bateu!
      messages.push(
        METAS.positivo({
          nome: user.nome.split(' ')[0],
          percentualAtingido: Math.round(percentualAtingido),
          metaValor,
          realizado,
          faltam,
          diasRestantes,
        })
      );

      if (percentualAtingido >= 100) {
        messages.push('Voce ja bateu a meta! 🎉 Agora e so bonus! Quer ver o ranking pra conferir sua posicao?');
      }
    } else if (percentualAtingido >= 50) {
      // Mensagem de incentivo - caminho certo
      messages.push(
        METAS.atencao({
          nome: user.nome.split(' ')[0],
          percentualAtingido: Math.round(percentualAtingido),
          metaValor,
          realizado,
          faltam,
          diasRestantes,
        })
      );

      // Dica de aceleracao
      const vendasFaltam = metaQuantidade ? metaQuantidade.meta_valor - metaQuantidade.valor_atual : 2;
      if (diasRestantes > 0 && vendasFaltam > 0) {
        const vendasPorDia = Math.ceil(vendasFaltam / diasRestantes);
        if (vendasPorDia <= 1) {
          messages.push(`Com 1 venda a cada ${Math.ceil(diasRestantes / vendasFaltam)} dias voce bate a meta! Da pra fazer!`);
        } else {
          messages.push(`Foco em ${vendasFaltam} vendas nesses ${diasRestantes} dias! Posso te ajudar a encontrar leads quentes!`);
        }
      }
    } else {
      // Mensagem de apoio com dicas - precisa acelerar
      messages.push(
        METAS.atencao({
          nome: user.nome.split(' ')[0],
          percentualAtingido: Math.round(percentualAtingido),
          metaValor,
          realizado,
          faltam,
          diasRestantes,
        })
      );

      // Dicas praticas
      messages.push('Algumas dicas pra acelerar:');
      const dicas = [
        '📞 Retoma contato com leads que visitaram mas nao fecharam',
        '🏠 Foca nos empreendimentos com mais disponibilidade',
        '💰 Oferece simulacao com entradas menores pra quem ta indeciso',
      ];
      messages.push(dicas.join('\n'));
      messages.push('Quer que eu te mostre os imoveis mais vendidos esse mes?');
    }

    return {
      messages,
      context: updateContext(context, {
        flow: 'metas',
        topic: 'metas_performance',
      }),
      shouldUseAI: false,
    };
  } catch (error) {
    console.error('Erro ao buscar metas:', error);
    messages.push('Tive um problema ao buscar suas metas. Tenta de novo daqui a pouco?');
    return {
      messages,
      context,
      shouldUseAI: false,
    };
  }
}

// ============================================
// FLUXO: STATUS DE PROCESSO
// ============================================

async function handleStatusFlow(
  user: User,
  text: string,
  context: ConversationContext
): Promise<FlowResult> {
  const intent = detectIntent(text);
  const messages: string[] = [];

  // Extrair nome do cliente ou CPF da mensagem
  const nomeCliente = intent.entities.nomeCliente;
  const cpf = intent.entities.cpf;

  // Se não temos identificação, verificar se estamos aguardando resposta
  if (!nomeCliente && !cpf) {
    // Se já estamos no fluxo e aguardando identificação
    if (context.current_flow === 'status' && context.awaiting_response === 'identificacao_cliente') {
      // Tentar extrair nome da mensagem direta (sem padrões específicos)
      const textTrimmed = text.trim();
      if (textTrimmed.length >= 2 && textTrimmed.length <= 100) {
        // Verificar se parece um CPF (11 dígitos)
        const possibleCpf = textTrimmed.replace(/\D/g, '');
        if (possibleCpf.length === 11) {
          // É um CPF
          const resultado = await getReservaStatus('', user.workspace_id || 1, possibleCpf);
          return buildStatusResponse(resultado, context);
        } else {
          // Assumir que é um nome
          const resultado = await getReservaStatus(textTrimmed, user.workspace_id || 1);
          return buildStatusResponse(resultado, context);
        }
      }
    }

    // Pedir identificação do cliente
    messages.push('Para consultar o status do processo, preciso do *nome do cliente* ou do *CPF*.');
    messages.push('Me manda uma dessas informações que eu busco pra você! 🔎');

    return {
      messages,
      context: updateContext(context, {
        flow: 'status',
        step: 1,
        awaiting: 'identificacao_cliente',
        topic: 'status_processo',
      }),
      shouldUseAI: false,
    };
  }

  // Buscar no CV CRM
  const resultado = await getReservaStatus(nomeCliente || '', user.workspace_id || 1, cpf);
  return buildStatusResponse(resultado, context);
}

/**
 * Constrói a resposta baseada no resultado da busca de reserva
 */
function buildStatusResponse(
  resultado: { encontrado: boolean; reservas: any[]; mensagem: string },
  context: ConversationContext
): FlowResult {
  const messages: string[] = [];

  if (!resultado.encontrado) {
    // Não encontrou nenhuma reserva
    messages.push('Não encontrei nenhum processo com esses dados. 🔍');
    messages.push('Confere se o nome ou CPF está correto e me manda de novo!');

    return {
      messages,
      context: updateContext(context, {
        flow: 'status',
        step: 1,
        awaiting: 'identificacao_cliente',
      }),
      shouldUseAI: false,
    };
  }

  if (resultado.reservas.length === 1) {
    // Encontrou apenas 1 resultado - mostrar status detalhado
    const reserva = resultado.reservas[0];
    const statusDetalhado = formatReservaDetalhada(reserva);
    messages.push(statusDetalhado);

    return {
      messages,
      context: updateContext(context, {
        flow: null,
        step: 0,
        awaiting: null,
        entities: { reservaId: reserva.id },
      }),
      shouldUseAI: false,
    };
  }

  // Encontrou múltiplos resultados - listar opções
  messages.push(`Encontrei *${resultado.reservas.length} processos* para esse cliente:\n`);

  const opcoes = resultado.reservas.slice(0, 5).map((reserva, index) => {
    const emp = reserva.empreendimento_nome || 'Empreendimento';
    const unidade = reserva.unidade_nome || 'Unidade';
    const status = reserva.status || 'Em andamento';
    return `${index + 1}. *${emp}* - ${unidade}\n   Status: ${status}`;
  });

  messages.push(opcoes.join('\n\n'));
  messages.push('\nQual deles você quer ver em detalhes? Manda o número! 📋');

  return {
    messages,
    context: updateContext(context, {
      flow: 'status',
      step: 2,
      awaiting: 'escolha_reserva',
      entities: { reservasEncontradas: resultado.reservas },
    }),
    shouldUseAI: false,
  };
}

/**
 * Formata uma reserva de forma detalhada para o usuário
 */
function formatReservaDetalhada(reserva: any): string {
  const linhas: string[] = [];

  // Cabeçalho
  const emp = reserva.empreendimento_nome || 'Empreendimento';
  const unidade = reserva.unidade_nome || 'Unidade';
  linhas.push(`✅ *${emp} - ${unidade}*\n`);

  // Cliente
  if (reserva.cliente_principal_nome) {
    linhas.push(`👤 Cliente: ${reserva.cliente_principal_nome}`);
  }

  // Número da reserva
  if (reserva.numero_reserva) {
    linhas.push(`📋 Reserva: ${reserva.numero_reserva}`);
  }

  // Status
  const status = reserva.status || 'Em andamento';
  const statusEmoji = getStatusEmoji(status);
  linhas.push(`${statusEmoji} Status: *${status}*`);

  // Valores
  if (reserva.valor_venda) {
    linhas.push(`💰 Valor: R$ ${Number(reserva.valor_venda).toLocaleString('pt-BR')}`);
  } else if (reserva.valor_reserva) {
    linhas.push(`💰 Valor da reserva: R$ ${Number(reserva.valor_reserva).toLocaleString('pt-BR')}`);
  }

  // Corretor responsável
  if (reserva.corretor_nome) {
    linhas.push(`🤝 Corretor: ${reserva.corretor_nome}`);
  }

  // Datas
  if (reserva.data_reserva) {
    const dataReserva = new Date(reserva.data_reserva).toLocaleDateString('pt-BR');
    linhas.push(`📅 Data da reserva: ${dataReserva}`);
  }

  if (reserva.data_venda) {
    const dataVenda = new Date(reserva.data_venda).toLocaleDateString('pt-BR');
    linhas.push(`📅 Data da venda: ${dataVenda}`);
  }

  return linhas.join('\n');
}

/**
 * Retorna emoji apropriado para o status
 */
function getStatusEmoji(status: string): string {
  const statusLower = status.toLowerCase();

  if (statusLower.includes('vendido') || statusLower.includes('concluido') || statusLower.includes('aprovado')) {
    return '✅';
  }
  if (statusLower.includes('reserv') || statusLower.includes('aguardando') || statusLower.includes('analise')) {
    return '⏳';
  }
  if (statusLower.includes('cancelad') || statusLower.includes('distrat')) {
    return '❌';
  }
  if (statusLower.includes('pendente')) {
    return '🔄';
  }

  return '📋';
}

// ============================================
// FLUXO: CONCORRENCIA
// ============================================

// Lista de concorrentes conhecidos para detecção
const CONCORRENTES_CONHECIDOS = [
  'mrv', 'cyrela', 'tenda', 'direcional', 'even', 'eztec',
  'cury', 'plano', 'viver', 'pdg', 'gafisa', 'tecnisa',
  'rossi', 'brookfield', 'camargo correa', 'odebrecht',
];

/**
 * Extrai nome do concorrente mencionado na mensagem
 */
function extractConcorrente(text: string): string | null {
  const normalizedText = text.toLowerCase();

  for (const concorrente of CONCORRENTES_CONHECIDOS) {
    if (normalizedText.includes(concorrente)) {
      // Capitaliza primeira letra
      return concorrente.charAt(0).toUpperCase() + concorrente.slice(1);
    }
  }

  return null;
}

/**
 * Verifica se a mensagem pede diferenciais gerais ou comparativo específico
 */
function isSolicitandoDiferenciais(text: string): boolean {
  const normalizedText = text.toLowerCase();
  const padroesGerais = [
    /diferencia(l|is)/i,
    /o\s*que\s*(tem|voc[eê]s?\s*t[eê]m)\s*de\s*(diferente|especial|melhor)/i,
    /por\s*que\s*(esse?|comprar\s*aqui|escolher)/i,
    /qual\s*(a\s*)?(vantagem|diferença)/i,
    /vantagem\s*(competitiva|sobre)/i,
    /porque\s*(pratica|vocês)/i,
  ];

  return padroesGerais.some(pattern => pattern.test(normalizedText));
}

/**
 * Formata os diferenciais da Pratica em uma mensagem estruturada
 */
function formatDiferenciais(): string {
  const diferenciais = Object.values(DIFERENCIAIS_PRATICA);

  const items = diferenciais.map(d =>
    `*${d.titulo}:* ${d.descricao}`
  ).join('\n\n');

  return items;
}

/**
 * Gera argumentos de venda para rebater concorrência
 */
function getArgumentosConcorrencia(): string[] {
  const argsConcorrencia = ARGUMENTOS_VENDA.concorrencia;
  return argsConcorrencia.argumentos;
}

/**
 * Handler do fluxo de concorrência
 *
 * Identifica se o usuário quer:
 * 1. Diferenciais gerais da Pratica
 * 2. Comparativo com concorrente específico
 *
 * E fornece argumentos de venda adequados
 */
async function handleConcorrenciaFlow(
  user: User,
  text: string,
  context: ConversationContext
): Promise<FlowResult> {
  const messages: string[] = [];
  const intent = detectIntent(text);

  // Se estamos esperando o nome do concorrente
  if (context.awaiting_response === 'concorrente_nome') {
    const concorrente = extractConcorrente(text) || text.trim();

    // Retornar comparativo com o concorrente
    messages.push(CONCORRENCIA.comparativo(concorrente));

    // Adicionar argumentos de venda
    const argumentos = getArgumentosConcorrencia();
    const argsSelecionados = argumentos.slice(0, 2).join('\n\n');
    messages.push(`\n*Argumentos para usar:*\n${argsSelecionados}`);

    return {
      messages,
      context: updateContext(context, {
        flow: null,
        awaiting: null,
        topic: 'concorrencia',
        entities: { concorrente },
      }),
      shouldUseAI: false,
      followUp: async (phone: string) => {
        await delay(800);
        await askAction(phone, 'Quer mais ajuda?', [
          { id: 'diferenciais', emoji: '🏆', label: 'Diferenciais' },
          { id: 'simular', emoji: '💰', label: 'Simular' },
          { id: 'buscar', emoji: '📍', label: 'Buscar' },
        ]);
      },
    };
  }

  // Verificar se menciona concorrente específico
  const concorrente = extractConcorrente(text);

  // Se pede diferenciais gerais (sem mencionar concorrente)
  if (isSolicitandoDiferenciais(text) && !concorrente) {
    messages.push(CONCORRENCIA.diferenciais());

    return {
      messages,
      context: updateContext(context, {
        flow: 'concorrencia',
        step: 1,
        topic: 'concorrencia',
        awaiting: null,
      }),
      shouldUseAI: false,
      followUp: async (phone: string) => {
        await delay(800);
        await askAction(phone, 'Posso ajudar com mais alguma coisa?', [
          { id: 'comparar', emoji: '🔄', label: 'Comparar' },
          { id: 'simular', emoji: '💰', label: 'Simular' },
          { id: 'buscar', emoji: '📍', label: 'Buscar' },
        ]);
      },
    };
  }

  // Se menciona concorrente específico - comparativo direto
  if (concorrente) {
    messages.push(CONCORRENCIA.comparativo(concorrente));

    // Adicionar argumentos relevantes
    const argumentos = getArgumentosConcorrencia();
    const argsSelecionados = argumentos.slice(0, 2).join('\n\n');
    messages.push(`\n*Argumentos para usar:*\n${argsSelecionados}`);

    return {
      messages,
      context: updateContext(context, {
        flow: 'concorrencia',
        step: 2,
        topic: 'concorrencia',
        entities: { concorrente },
        awaiting: null,
      }),
      shouldUseAI: false,
      followUp: async (phone: string) => {
        await delay(800);
        await askAction(phone, 'Quer mais ajuda?', [
          { id: 'diferenciais', emoji: '🏆', label: 'Diferenciais' },
          { id: 'porque_pratica', emoji: '❓', label: 'Por que Pratica?' },
          { id: 'simular', emoji: '💰', label: 'Simular' },
        ]);
      },
    };
  }

  // Intent de comparação sem mencionar concorrente - perguntar qual
  if (intent.intent === 'concorrencia_comparar') {
    messages.push('Com qual construtora voce quer comparar? Me conta o nome que eu te dou os argumentos na hora!');

    return {
      messages,
      context: updateContext(context, {
        flow: 'concorrencia',
        step: 1,
        topic: 'concorrencia',
        awaiting: 'concorrente_nome',
      }),
      shouldUseAI: false,
    };
  }

  // Intent de vantagem - mostrar por que escolher a Pratica
  if (intent.intent === 'concorrencia_vantagem') {
    messages.push(CONCORRENCIA.porquePratica());

    return {
      messages,
      context: updateContext(context, {
        flow: 'concorrencia',
        step: 1,
        topic: 'concorrencia',
        awaiting: null,
      }),
      shouldUseAI: false,
      followUp: async (phone: string) => {
        await delay(800);
        await askAction(phone, 'Posso ajudar com mais alguma coisa?', [
          { id: 'diferenciais', emoji: '🏆', label: 'Diferenciais' },
          { id: 'comparar', emoji: '🔄', label: 'Comparar' },
          { id: 'buscar', emoji: '📍', label: 'Buscar' },
        ]);
      },
    };
  }

  // Fallback - mostrar diferenciais gerais
  messages.push(CONCORRENCIA.diferenciais());

  return {
    messages,
    context: updateContext(context, {
      flow: 'concorrencia',
      step: 1,
      topic: 'concorrencia',
      awaiting: null,
    }),
    shouldUseAI: false,
    followUp: async (phone: string) => {
      await delay(800);
      await askAction(phone, 'Quer comparar com alguma construtora especifica?', [
        { id: 'comparar', emoji: '🔄', label: 'Comparar' },
        { id: 'porque_pratica', emoji: '❓', label: 'Por que Pratica?' },
        { id: 'simular', emoji: '💰', label: 'Simular' },
      ]);
    },
  };
}

// ============================================
// FLUXO: AJUDA DO APP
// ============================================

type FuncionalidadeAjuda = 'simulacao' | 'proposta' | 'relatorios' | 'comissoes' | 'geral';

function detectarFuncionalidadeAjuda(text: string): FuncionalidadeAjuda {
  const lower = text.toLowerCase();
  if (lower.includes('simul') || lower.includes('financ') || lower.includes('parcela') || lower.includes('entrada') || lower.includes('calcul')) return 'simulacao';
  if (lower.includes('propost') || lower.includes('reserv') || lower.includes('enviar') || lower.includes('cliente') || lower.includes('documento')) return 'proposta';
  if (lower.includes('relat') || lower.includes('dashboard') || lower.includes('grafico') || lower.includes('estatistic') || lower.includes('desempenho') || lower.includes('performance')) return 'relatorios';
  if (lower.includes('comiss') || lower.includes('pagamento') || lower.includes('receber') || lower.includes('ganho')) return 'comissoes';
  return 'geral';
}

async function handleAjudaAppFlow(user: User, text: string, context: ConversationContext): Promise<FlowResult> {
  const messages: string[] = [];
  const funcionalidade = detectarFuncionalidadeAjuda(text);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pratica.escreve.ai';

  if (context.current_flow === 'ajuda_app' && context.awaiting_response === 'escolha_funcionalidade') {
    const escolha = text.toLowerCase().trim();
    let funcEscolhida: FuncionalidadeAjuda = 'geral';
    if (escolha.includes('1') || escolha.includes('simul')) funcEscolhida = 'simulacao';
    else if (escolha.includes('2') || escolha.includes('propost')) funcEscolhida = 'proposta';
    else if (escolha.includes('3') || escolha.includes('relat')) funcEscolhida = 'relatorios';
    else if (escolha.includes('4') || escolha.includes('comiss')) funcEscolhida = 'comissoes';
    if (funcEscolhida !== 'geral') return gerarRespostaAjudaFuncionalidade(funcEscolhida, user, context, appUrl);
  }

  if (funcionalidade !== 'geral') return gerarRespostaAjudaFuncionalidade(funcionalidade, user, context, appUrl);

  const respostaFAQ = buscarNoFAQ(text);
  if (respostaFAQ) {
    messages.push(`Achei a resposta pra voce! 📚`);
    messages.push(respostaFAQ);
    messages.push(`Isso respondeu sua duvida? Se precisar de mais algo, e so falar! 😊`);
    return { messages, context: updateContext(context, { flow: null, awaiting: null, topic: 'ajuda_app' }), shouldUseAI: false };
  }

  messages.push(`Sem problemas, ${user.nome}! 🤝`);
  messages.push(`Posso te ajudar com:`);
  messages.push(`1️⃣ *Simulacao* - Como calcular financiamento\n2️⃣ *Proposta* - Como criar e enviar propostas\n3️⃣ *Relatorios* - Como ver seus resultados\n4️⃣ *Comissoes* - Como consultar seus ganhos`);
  messages.push(`Qual dessas voce quer saber mais?`);
  return { messages, context: updateContext(context, { flow: 'ajuda_app', awaiting: 'escolha_funcionalidade', topic: 'ajuda_app' }), shouldUseAI: false };
}

function gerarRespostaAjudaFuncionalidade(funcionalidade: FuncionalidadeAjuda, user: User, context: ConversationContext, appUrl: string): FlowResult {
  const messages: string[] = [];
  switch (funcionalidade) {
    case 'simulacao':
      messages.push(`Boa pergunta! 💡`);
      messages.push(AJUDA_APP.simulacao());
      messages.push(`Quer que eu faca uma simulacao agora pra voce? E so me passar o valor do imovel! 💰`);
      return { messages, context: updateContext(context, { flow: null, awaiting: null, topic: 'ajuda_simulacao' }), shouldUseAI: false, followUp: async (phone: string) => { await delay(1500); await askAction(phone, 'O que prefere?', [{ id: 'simular', emoji: '💰', label: 'Simular agora' }, { id: 'mais_ajuda', emoji: '❓', label: 'Mais duvidas' }]); } };
    case 'proposta':
      messages.push(`Te explico! 📋`);
      messages.push(AJUDA_APP.proposta());
      messages.push(`Quer ir direto pro menu de propostas no app?`);
      return { messages, context: updateContext(context, { flow: null, awaiting: null, topic: 'ajuda_proposta' }), shouldUseAI: false, followUp: async (phone: string) => { await delay(1500); await sendActionButtons(phone, 'Acesso rapido:', [{ type: 'URL', label: 'Abrir Propostas', url: `${appUrl}/corretor/propostas` }]); } };
    case 'relatorios':
      messages.push(`Vou te mostrar! 📊`);
      messages.push(AJUDA_APP.relatorios());
      messages.push(`Quer acessar seus relatorios agora?`);
      return { messages, context: updateContext(context, { flow: null, awaiting: null, topic: 'ajuda_relatorios' }), shouldUseAI: false, followUp: async (phone: string) => { await delay(1500); await sendActionButtons(phone, 'Acesso rapido:', [{ type: 'URL', label: 'Ver Relatorios', url: `${appUrl}/corretor/relatorios` }]); } };
    case 'comissoes':
      messages.push(`Claro! 💵`);
      messages.push(AJUDA_APP.comissoes());
      messages.push(`Quer que eu consulte suas comissoes agora ou prefere abrir no app?`);
      return { messages, context: updateContext(context, { flow: null, awaiting: null, topic: 'ajuda_comissoes' }), shouldUseAI: false, followUp: async (phone: string) => { await delay(1500); await askAction(phone, 'O que prefere?', [{ id: 'comissao', emoji: '💵', label: 'Ver comissoes' }, { id: 'abrir_app', emoji: '📱', label: 'Abrir no app' }]); } };
    default:
      messages.push(`Posso te ajudar com o app! 🤝`);
      messages.push(`Principais funcoes:\n\n📱 *Simular* - Calcula financiamento na hora\n📋 *Propostas* - Envia e acompanha vendas\n📊 *Relatorios* - Ve seu desempenho\n💵 *Comissoes* - Consulta seus ganhos`);
      messages.push(`Sobre qual voce quer saber mais?`);
      return { messages, context: updateContext(context, { flow: 'ajuda_app', awaiting: 'escolha_funcionalidade', topic: 'ajuda_app' }), shouldUseAI: false };
  }
}

// ============================================
// FLUXO: COMISSAO
// ============================================

async function handleComissaoFlow(
  user: User,
  text: string,
  context: ConversationContext
): Promise<FlowResult> {
  const messages: string[] = [];
  const action = normalizeAction(text);

  // Identificar o corretor pelo contexto - buscar cvcrm_id do usuario
  const corretorId = await getCorretorIdByUserId(user.id);

  if (!corretorId) {
    messages.push(
      `${user.nome}, nao consegui localizar seu cadastro de corretor no sistema.`
    );
    messages.push(
      `Fala com seu gerente pra verificar se ta tudo certo no CV CRM.`
    );
    return {
      messages,
      context: updateContext(context, {
        flow: null,
        topic: 'comissao',
      }),
      shouldUseAI: false,
    };
  }

  // Buscar comissoes do corretor
  const { comissoes, resumo } = await getComissoesCorretor(String(corretorId), user.workspace_id || 1);

  // Se nao tem comissoes
  if (comissoes.length === 0) {
    messages.push(
      `${user.nome}, nao encontrei comissoes registradas pra voce no momento.`
    );
    messages.push(
      `Isso pode significar que voce ainda nao tem vendas finalizadas ou que os pagamentos ja foram todos processados.`
    );
    messages.push(`Qualquer duvida, fala com seu gerente!`);
    return {
      messages,
      context: updateContext(context, {
        flow: null,
        topic: 'comissao',
      }),
      shouldUseAI: false,
    };
  }

  // Verificar se pediu detalhes
  const querDetalhes =
    action.includes('detalhe') ||
    action.includes('lista') ||
    action.includes('todas') ||
    action.includes('cada') ||
    action.includes('venda') ||
    context.awaiting_response === 'comissao_detalhes';

  if (querDetalhes && context.current_flow === 'comissao') {
    // Listar comissoes por venda - separar pendentes e pagas
    messages.push(`*Suas Comissoes por Venda:*\n`);

    const pendentes = comissoes.filter((c) => {
      const statusLower = (c.status || '').toLowerCase();
      return !statusLower.includes('pago') && !statusLower.includes('liquidado') && !statusLower.includes('quitado');
    });

    const pagas = comissoes.filter((c) => {
      const statusLower = (c.status || '').toLowerCase();
      return statusLower.includes('pago') || statusLower.includes('liquidado') || statusLower.includes('quitado');
    });

    if (pendentes.length > 0) {
      messages.push(`*A Receber (${pendentes.length}):*`);
      for (const c of pendentes.slice(0, 5)) {
        const empreendimento = c.empreendimento_nome || 'Empreendimento';
        const valor = formatCurrency(c.valor);
        const previsao = c.data_previsao ? new Date(c.data_previsao).toLocaleDateString('pt-BR') : 'A definir';
        const percentStr = c.percentual ? ` (${c.percentual}%)` : '';
        messages.push(`- ${empreendimento}: ${valor}${percentStr} - Prev: ${previsao}`);
      }
      if (pendentes.length > 5) messages.push(`... e mais ${pendentes.length - 5} comissoes pendentes.`);
    }

    if (pagas.length > 0) {
      messages.push(`\n*Recebidas (${pagas.length}):*`);
      for (const c of pagas.slice(0, 3)) {
        const empreendimento = c.empreendimento_nome || 'Empreendimento';
        const valor = formatCurrency(c.valor);
        const dataPgto = c.data_pagamento ? new Date(c.data_pagamento).toLocaleDateString('pt-BR') : 'N/D';
        messages.push(`- ${empreendimento}: ${valor} - Pago em ${dataPgto}`);
      }
      if (pagas.length > 3) messages.push(`... e mais ${pagas.length - 3} comissoes ja pagas.`);
    }

    return {
      messages,
      context: updateContext(context, { flow: null, awaiting: null, topic: 'comissao' }),
      shouldUseAI: false,
    };
  }

  // Resumo padrao
  const now = new Date();
  const mesAtual = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Calcular recebido no mes atual
  const recebidoNoMes = comissoes
    .filter((c) => {
      const statusLower = (c.status || '').toLowerCase();
      const isPago = statusLower.includes('pago') || statusLower.includes('liquidado') || statusLower.includes('quitado');
      if (!isPago || !c.data_pagamento) return false;
      const dataPgto = new Date(c.data_pagamento);
      return dataPgto.getMonth() === now.getMonth() && dataPgto.getFullYear() === now.getFullYear();
    })
    .reduce((acc, c) => acc + (parseFloat(String(c.valor)) || 0), 0);

  // Proximo pagamento
  const proximoPagamento = comissoes
    .filter((c) => {
      const statusLower = (c.status || '').toLowerCase();
      const isPendente = !statusLower.includes('pago') && !statusLower.includes('liquidado') && !statusLower.includes('quitado');
      return isPendente && c.data_previsao;
    })
    .sort((a, b) => {
      const dateA = a.data_previsao ? new Date(a.data_previsao).getTime() : Infinity;
      const dateB = b.data_previsao ? new Date(b.data_previsao).getTime() : Infinity;
      return dateA - dateB;
    })[0];

  messages.push(`*Resumo de Comissoes - ${mesAtual}*\n`);
  messages.push(`*Total a Receber:* ${formatCurrency(resumo.total_pendente)}`);
  const qtdLabel = resumo.quantidade_pendente === 1 ? 'comissao pendente' : 'comissoes pendentes';
  messages.push(`   (${resumo.quantidade_pendente} ${qtdLabel})`);
  messages.push(`\n*Recebido no Mes:* ${formatCurrency(recebidoNoMes)}`);

  if (proximoPagamento) {
    const dataProx = proximoPagamento.data_previsao ? new Date(proximoPagamento.data_previsao).toLocaleDateString('pt-BR') : 'A definir';
    const valorProx = formatCurrency(proximoPagamento.valor);
    messages.push(`\n*Proximo Pagamento:* ${dataProx}`);
    messages.push(`   ${proximoPagamento.empreendimento_nome || 'Venda'}: ${valorProx}`);
  }

  messages.push(`\n*Total Geral:* ${formatCurrency(resumo.total_geral)}`);

  return {
    messages,
    context: updateContext(context, { flow: 'comissao', awaiting: 'comissao_detalhes', topic: 'comissao' }),
    shouldUseAI: false,
    followUp: async (phone: string) => {
      await delay(800);
      await askAction(phone, 'Quer ver os detalhes?', [
        { id: 'comissao_detalhes', emoji: '📋', label: 'Ver por Venda' },
        { id: 'voltar', emoji: '🏠', label: 'Menu Principal' },
      ]);
    },
  };
}

// ============================================
// FLUXO: OBJECAO
// ============================================

type ObjecaoTipo = 'caro' | 'longe' | 'pequeno' | 'inseguranca' | 'concorrencia' | null;

function detectObjecaoTipo(text: string): ObjecaoTipo {
  const normalizedText = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const caroPatterns = [/caro/, /muito\s*caro/, /preco\s*(alto|elevado)/, /nao\s*cabe/, /orcamento/, /fora\s*da\s*realidade/, /absurdo/, /exagerado/, /nao\s*tenho\s*(esse)?\s*(dinheiro|valor)/, /achou\s*caro/, /cliente\s*achou\s*caro/, /ta\s*caro/, /esta\s*caro/];
  for (const pattern of caroPatterns) { if (pattern.test(normalizedText)) return 'caro'; }
  const longePatterns = [/longe/, /distante/, /localizacao/, /bairro\s*(ruim|longe)/, /regiao/, /queria\s*mais\s*perto/, /nao\s*conheco/, /afastado/, /muito\s*longe/, /achou\s*longe/, /cliente\s*achou\s*longe/];
  for (const pattern of longePatterns) { if (pattern.test(normalizedText)) return 'longe'; }
  const pequenoPatterns = [/pequeno/, /apertado/, /pouco\s*espaco/, /queria\s*maior/, /nao\s*cabe/, /familia\s*crescendo/, /metragem\s*(baixa|pequena)/, /achou\s*pequeno/, /cliente\s*achou\s*pequeno/, /muito\s*pequeno/];
  for (const pattern of pequenoPatterns) { if (pattern.test(normalizedText)) return 'pequeno'; }
  const insegurancaPatterns = [/medo/, /inseguro/, /e\s*se/, /nao\s*conseguir/, /perder\s*emprego/, /instabilidade/, /risco/, /divida/, /compromisso\s*(grande|muito)/, /receio/, /preocupado/, /preocupacao/, /pensar\s*(mais|melhor)/, /preciso\s*pensar/, /vou\s*pensar/];
  for (const pattern of insegurancaPatterns) { if (pattern.test(normalizedText)) return 'inseguranca'; }
  const concorrenciaPatterns = [/concorrencia/, /outro\s*empreendimento/, /outra\s*construtora/, /vi\s*melhor/, /mais\s*barato\s*(la|ali)/, /prefiro\s*(outro|outra)/, /comparando/, /mrv/, /tenda/, /direcional/, /cyrela/, /gafisa/];
  for (const pattern of concorrenciaPatterns) { if (pattern.test(normalizedText)) return 'concorrencia'; }
  return null;
}

async function extractEmpreendimentoFromContext(text: string, context: ConversationContext): Promise<{ id: string; nome: string } | null> {
  if (context.entities.empreendimento) {
    try {
      const response = await getEmpreendimentosCVCRM();
      const responseAny = response as any;
      const empreendimentos = Array.isArray(response) ? response : (responseAny.empreendimentos || responseAny.data || []);
      const matched = empreendimentos.find((emp: any) => String(emp.idempreendimento || emp.id) === String(context.entities.empreendimento));
      if (matched) { return { id: String(matched.idempreendimento || matched.id), nome: String(matched.nome || matched.empreendimento || 'Empreendimento') }; }
    } catch (error) { console.error('Error fetching empreendimento:', error); }
  }
  const normalizedText = text.toLowerCase();
  try {
    const response = await getEmpreendimentosCVCRM();
    const responseAny = response as any;
    const empreendimentos = Array.isArray(response) ? response : (responseAny.empreendimentos || responseAny.data || []);
    for (const emp of empreendimentos) {
      const nome = String(emp.nome || emp.empreendimento || '').toLowerCase();
      if (nome && normalizedText.includes(nome)) { return { id: String(emp.idempreendimento || emp.id), nome: String(emp.nome || emp.empreendimento) }; }
    }
  } catch (error) { console.error('Error searching empreendimento in text:', error); }
  return null;
}

async function handleObjecaoFlow(user: User, text: string, context: ConversationContext): Promise<FlowResult> {
  const messages: string[] = [];
  if (context.current_flow === 'objecao' && context.awaiting_response === 'mais_argumentos') {
    return handleObjecaoFlowContinuation(user, text, context);
  }
  const tipoObjecao = detectObjecaoTipo(text);
  const empreendimento = await extractEmpreendimentoFromContext(text, context);
  if (!tipoObjecao) {
    if (empreendimento) { messages.push(`Pra ajudar melhor no *${empreendimento.nome}*, me conta qual foi a objecao do cliente. Eu ja registro aqui.`); }
    else { messages.push(`Qual e a objecao do cliente? Ex: "ta caro", "e longe", "apartamento pequeno", "to inseguro"... Eu ja registro aqui.`); }
    return { messages, context: updateContext(context, { flow: 'objecao', step: 1, awaiting: 'tipo_objecao', topic: 'objecao' }), shouldUseAI: false };
  }
  const argumentosData = ARGUMENTOS_VENDA[tipoObjecao];
  switch (tipoObjecao) {
    case 'caro': messages.push(OBJECAO.caro(empreendimento?.nome)); break;
    case 'longe': messages.push(OBJECAO.longe(empreendimento?.nome, undefined)); break;
    case 'pequeno': const metragem = context.entities.metragem as number | undefined; messages.push(OBJECAO.pequeno(metragem)); break;
    case 'inseguranca': messages.push(OBJECAO.generico(user.nome)); break;
    case 'concorrencia': messages.push(CONCORRENCIA.diferenciais()); break;
  }
  if (argumentosData && argumentosData.perguntasQualificacao.length > 0) {
    const perguntaIndex = Math.floor(Math.random() * argumentosData.perguntasQualificacao.length);
    messages.push(`\n💡 *Dica:* Pergunte ao cliente: "${argumentosData.perguntasQualificacao[perguntaIndex]}"`);
  }
  const mensagemRegistro = messages.join('\n');
  if (empreendimento?.id) {
    await registerEmpreendimentoInteracao(
      user.id,
      { id: empreendimento.id, nome: empreendimento.nome },
      'resumo',
      mensagemRegistro,
      context,
      user.workspace_id
    );
  }
  await registrarAtividade(
    user.id,
    'Objecao tratada via WhatsApp',
    `Tipo: ${tipoObjecao}. Empreendimento: ${empreendimento?.nome || 'nao informado'}.`
  );
  return {
    messages,
    context: updateContext(context, { flow: 'objecao', step: 2, awaiting: 'mais_argumentos', topic: 'objecao', entities: { ...context.entities, tipoObjecao, empreendimento: empreendimento?.id } }),
    shouldUseAI: false,
    followUp: async (phone: string) => {
      await delay(1500);
      await askAction(phone, 'Quer mais argumentos pra essa objecao?', [
        { id: 'mais_argumentos', emoji: '💬', label: 'Mais argumentos' },
        { id: 'outra_objecao', emoji: '🔄', label: 'Outra objecao' },
        { id: 'diferenciais', emoji: '⭐', label: 'Diferenciais Pratica' },
      ]);
    },
  };
}

async function handleObjecaoFlowContinuation(user: User, text: string, context: ConversationContext): Promise<FlowResult> {
  const messages: string[] = [];
  const action = normalizeAction(text);
  if (action.includes('mais') || action.includes('argumento') || text.includes('mais_argumentos')) {
    const tipoObjecao = context.entities.tipoObjecao as ObjecaoTipo;
    if (tipoObjecao && ARGUMENTOS_VENDA[tipoObjecao]) {
      const argumentosData = ARGUMENTOS_VENDA[tipoObjecao];
      const argIndex = Math.floor(Math.random() * (argumentosData.argumentos.length - 1)) + 1;
      const argumento = argumentosData.argumentos[argIndex] || argumentosData.argumentos[0];
      messages.push(`📌 *Argumento adicional:*\n\n${argumento}`);
      if (argumentosData.frasesChave.length > 0) {
        const fraseIndex = Math.floor(Math.random() * argumentosData.frasesChave.length);
        messages.push(`\n🎯 *Frase-chave:* "${argumentosData.frasesChave[fraseIndex]}"`);
      }
      await registrarAtividade(
        user.id,
        'Objecao tratada via WhatsApp',
        `Tipo: ${tipoObjecao}. Argumento adicional enviado.`
      );
      return {
        messages,
        context,
        shouldUseAI: false,
        followUp: async (phone: string) => {
          await delay(1000);
          await askAction(phone, 'Precisa de mais alguma coisa?', [
            { id: 'mais_argumentos', emoji: '💬', label: 'Mais argumentos' },
            { id: 'simular', emoji: '💰', label: 'Simular' },
            { id: 'outra_objecao', emoji: '🔄', label: 'Outra objecao' },
          ]);
        },
      };
    }
  }
  if (action.includes('diferencial') || action.includes('pratica') || text.includes('diferenciais')) {
    messages.push(CONCORRENCIA.porquePratica());
    return { messages, context: updateContext(context, { flow: null, awaiting: null }), shouldUseAI: false };
  }
  if (action.includes('outra') || text.includes('outra_objecao')) {
    messages.push(`Qual e a objecao do cliente? Ex: "ta caro", "e longe", "apartamento pequeno", "to inseguro"...`);
    return { messages, context: updateContext(context, { flow: 'objecao', step: 1, awaiting: 'tipo_objecao', entities: { ...context.entities, tipoObjecao: null } }), shouldUseAI: false };
  }
  const novoTipo = detectObjecaoTipo(text);
  if (novoTipo) {
    const newContext = updateContext(context, { flow: null, awaiting: null, entities: { ...context.entities, tipoObjecao: null } });
    return handleObjecaoFlow(user, text, newContext);
  }
  return { messages: [], context, shouldUseAI: true };
}

// ============================================
// RESPOSTA COM IA (GPT)
// ============================================

async function generateAIResponse(
  user: User,
  text: string,
  context: ConversationContext,
  messages: ConversationMessage[],
  sentiment: Sentiment,
  psychologyAnalysis?: PsychologicalAnalysis,
  agentConfig?: AgentConfig,
  eventoPrompt?: string
): Promise<string> {
  let portfolioSummary = '';

  try {
    const response = await getEmpreendimentosCVCRM();
    const responseAny = response as any;
    const empreendimentos = Array.isArray(response)
      ? response
      : (responseAny.empreendimentos || responseAny.data || []);

    const byBairro = new Map<string, string[]>();
    for (const emp of empreendimentos) {
      const bairro = String(emp.bairro?.nome || emp.bairro || emp.bairro_nome || 'Sem bairro');
      const nome = String(emp.nome || emp.empreendimento || '').trim();
      if (!nome) continue;
      const list = byBairro.get(bairro) || [];
      if (list.length < 3) list.push(nome);
      byBairro.set(bairro, list);
    }

    const lines = Array.from(byBairro.entries())
      .slice(0, 8)
      .map(([bairro, list]) => `- ${bairro}: ${list.join(', ')}`);
    portfolioSummary = lines.join('\n');
  } catch (error) {
    console.error('Error loading portfolio summary:', error);
  }

  // Buscar atividades recentes (com isolamento workspace)
  const teWsFilter = user.workspace_id ? ' and workspace_id = $2' : '';
  const teWsParams = user.workspace_id ? [user.id, user.workspace_id] : [user.id];
  const { rows: activities } = await dbQuery(
    `select event_type, page
     from tracking_events
     where user_id = $1${teWsFilter}
     order by created_at desc
     limit 5`,
    teWsParams
  );
  const recentActivities = activities
    .map((a) => `${a.event_type} em ${a.page}`)
    .join(', ');

  // Obter persona adaptada ao perfil do usuario
  const persona = await getPersonaByUser(user);

  let ragContext = '';
  if (shouldUseRAG(text)) {
    const retrieved = await retrieveContext(text, {
      limit: 6,
      threshold: 0.72,
    });
    ragContext = buildRAGPrompt(retrieved, text);
  }

  // Analyze psychology if not already provided
  let psychology = psychologyAnalysis;
  if (!psychology) {
    try {
      psychology = await analyzePsychology(
        text,
        formatMessagesForPrompt(messages)
      );
    } catch (error) {
      console.warn('[Sofia] Psychology analysis failed, using default:', error);
    }
  }

  // Determinar nome e papel do agente (usar agentConfig se disponivel)
  const agentName = agentConfig?.agentName || 'Sofia';
  const agentRole = agentConfig?.agentRole || 'Assistente de vendas e suporte';

  // Ajustar tom baseado na personality do agentConfig
  let personalityTone = '';
  if (agentConfig?.personality) {
    switch (agentConfig.personality) {
      case 'amigavel':
        personalityTone = 'Seja calorosa, acolhedora e use linguagem informal e amigável.';
        break;
      case 'profissional':
        personalityTone = 'Mantenha um tom profissional, educado e formal nas respostas.';
        break;
      case 'direto':
        personalityTone = 'Seja objetiva e direta, indo direto ao ponto sem rodeios.';
        break;
    }
  }

  // Use psychological system prompt when psychology data is available
  let systemPrompt = psychology
    ? buildPsychologicalSystemPrompt({
        userName: user.nome,
        userRole: user.role,
        imobiliaria: user.imobiliarias?.nome || 'Pratica',
        psychology,
        recentActivities,
        conversationHistory: formatMessagesForPrompt(messages),
        currentIntent: context.last_intent || undefined,
        sentiment,
        portfolioSummary,
        persona,
        ragContext,
      })
    : buildSofiaSystemPrompt({
        userName: user.nome,
        userRole: user.role,
        imobiliaria: user.imobiliarias?.nome || 'Pratica',
        recentActivities,
        conversationHistory: formatMessagesForPrompt(messages),
        currentIntent: context.last_intent || undefined,
        sentiment,
        portfolioSummary,
        persona,
        ragContext,
      });

  // Se temos agentConfig, ajustar o prompt com nome e personalidade customizados
  if (agentConfig) {
    // Substituir referências ao nome Sofia pelo nome do agente
    systemPrompt = systemPrompt.replace(/Sofia/g, agentName);

    // Adicionar tom de personalidade ao prompt
    if (personalityTone) {
      systemPrompt = `${personalityTone}\n\n${systemPrompt}`;
    }
  }

  // Se temos contexto de evento, adicionar ao prompt
  if (eventoPrompt) {
    systemPrompt = `${systemPrompt}\n\n${eventoPrompt}`;
  }

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      max_tokens: 300,
      temperature: 0.8,
    });

    return (
      completion.choices[0]?.message?.content ||
      'Desculpa, não consegui processar sua mensagem.'
    );
  } catch (error) {
    console.error('Error with OpenAI:', error);
    return SUPORTE.erroGenerico();
  }
}

// ============================================
// FLUXO: CAMPANHA
// ============================================

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  message_template: string;
  segmentation_config: Record<string, unknown>;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  stats: {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    replied: number;
    failed: number;
  };
  created_at: string;
  updated_at: string;
}

async function getCampanhasAtivas(workspaceId?: number): Promise<Campaign[]> {
  const wsFilter = workspaceId ? ' AND workspace_id = $1' : '';
  const wsParams = workspaceId ? [workspaceId] : [];

  const { rows } = await dbQuery(
    `SELECT * FROM campaigns
     WHERE status IN ('active', 'scheduled', 'running')
     AND (completed_at IS NULL OR completed_at > NOW())${wsFilter}
     ORDER BY created_at DESC`,
    wsParams
  );
  return rows as Campaign[];
}

async function getCampanhaById(id: string, workspaceId?: number): Promise<Campaign | null> {
  const wsFilter = workspaceId ? ' AND workspace_id = $2' : '';
  const wsParams = workspaceId ? [id, workspaceId] : [id];

  const { rows } = await dbQuery(
    `SELECT * FROM campaigns WHERE id = $1${wsFilter} LIMIT 1`,
    wsParams
  );
  return (rows[0] as Campaign) || null;
}

function formatarDetalhesCampanha(campanha: Campaign): string {
  const linhas: string[] = [];

  linhas.push(`📢 *${campanha.name}*`);
  linhas.push('');

  if (campanha.description) {
    linhas.push(`📋 ${campanha.description}`);
    linhas.push('');
  }

  // Extrair condições do segmentation_config ou message_template
  if (campanha.message_template) {
    linhas.push('💡 *Condições:*');
    linhas.push(campanha.message_template);
    linhas.push('');
  }

  // Validade
  if (campanha.scheduled_at) {
    const dataFim = new Date(campanha.scheduled_at);
    const hoje = new Date();
    const diasRestantes = Math.ceil((dataFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    linhas.push(`⏰ *Validade:* Até ${dataFim.toLocaleDateString('pt-BR')}`);
    if (diasRestantes > 0 && diasRestantes <= 7) {
      linhas.push(`⚡ *Restam apenas ${diasRestantes} dia${diasRestantes > 1 ? 's' : ''}!*`);
    }
  } else {
    linhas.push('⏰ *Validade:* Por tempo limitado');
  }

  // Stats se disponível
  if (campanha.stats && campanha.stats.total > 0) {
    linhas.push('');
    linhas.push(`📊 ${campanha.stats.sent || 0} corretores já estão usando!`);
  }

  return linhas.join('\n');
}

async function handleCampanhaFlow(
  user: User,
  text: string,
  context: ConversationContext
): Promise<FlowResult> {
  const messages: string[] = [];
  const normalizedText = text.toLowerCase().trim();

  // Verificar se está pedindo detalhes de uma campanha específica
  if (context.awaiting_response === 'escolha_campanha') {
    const campanhas = await getCampanhasAtivas(user.workspace_id);

    // Tentar encontrar campanha pelo nome ou índice
    let campanhaEncontrada: Campaign | null = null;

    // Verificar se é um número (índice)
    const indexMatch = normalizedText.match(/^(\d+)$/);
    if (indexMatch) {
      const index = parseInt(indexMatch[1]) - 1;
      if (index >= 0 && index < campanhas.length) {
        campanhaEncontrada = campanhas[index];
      }
    }

    // Tentar encontrar pelo nome
    if (!campanhaEncontrada) {
      campanhaEncontrada = campanhas.find(c =>
        c.name.toLowerCase().includes(normalizedText) ||
        normalizedText.includes(c.name.toLowerCase())
      ) || null;
    }

    if (campanhaEncontrada) {
      const detalhes = formatarDetalhesCampanha(campanhaEncontrada);
      messages.push(detalhes);

      return {
        messages,
        context: updateContext(context, {
          flow: null,
          awaiting: null,
          topic: 'campanha',
        }),
        shouldUseAI: false,
        followUp: async (phone: string) => {
          await delay(500);
          await askAction(phone, 'O que mais posso te ajudar?', [
            { id: 'buscar', emoji: '📍', label: 'Bairros' },
            { id: 'simular', emoji: '💰', label: 'Simular' },
            { id: 'campanhas', emoji: '🔥', label: 'Campanhas' },
          ]);
        },
      };
    } else {
      messages.push('Não encontrei essa campanha. Me diz o número ou nome dela:');
      return {
        messages,
        context,
        shouldUseAI: false,
      };
    }
  }

  // Buscar campanhas ativas
  const campanhas = await getCampanhasAtivas();

  if (campanhas.length === 0) {
    messages.push('No momento não tem nenhuma campanha ativa. 😊');
    messages.push('Quer que eu te avise quando sair uma nova campanha?');

    return {
      messages,
      context: updateContext(context, {
        flow: null,
        awaiting: 'notificar_campanha',
        topic: 'campanha',
      }),
      shouldUseAI: false,
      followUp: async (phone: string) => {
        await delay(500);
        await askYesNo(phone, 'Me avisa quando tiver campanha?');
      },
    };
  }

  // Verificar se quer detalhes de campanha específica
  const querDetalhes = normalizedText.includes('detalhe') ||
                       normalizedText.includes('mais sobre') ||
                       normalizedText.includes('me conta');

  if (campanhas.length === 1 || querDetalhes) {
    // Se só tem uma campanha ou quer detalhes, mostrar completo
    const campanha = campanhas[0];
    const detalhes = formatarDetalhesCampanha(campanha);
    messages.push('🔥 *Campanha Ativa!*');
    messages.push(detalhes);

    return {
      messages,
      context: updateContext(context, {
        flow: null,
        awaiting: null,
        topic: 'campanha',
        entities: { campanhaId: campanha.id },
      }),
      shouldUseAI: false,
      followUp: async (phone: string) => {
        await delay(500);
        await askAction(phone, 'Bora aproveitar essa campanha?', [
          { id: 'buscar', emoji: '📍', label: 'Ver Imóveis' },
          { id: 'simular', emoji: '💰', label: 'Simular' },
          { id: 'material', emoji: '📎', label: 'Material' },
        ]);
      },
    };
  }

  // Múltiplas campanhas - listar e perguntar qual quer ver
  messages.push(`🔥 *${campanhas.length} Campanhas Ativas!*\n`);

  const listaCampanhas = campanhas.map((c, index) => {
    const validade = c.scheduled_at
      ? `Até ${new Date(c.scheduled_at).toLocaleDateString('pt-BR')}`
      : 'Tempo limitado';
    return `${index + 1}. *${c.name}*\n   ${validade}`;
  }).join('\n\n');

  messages.push(listaCampanhas);
  messages.push('\nQual campanha quer ver em detalhe? Manda o número!');

  return {
    messages,
    context: updateContext(context, {
      flow: 'campanha',
      step: 1,
      awaiting: 'escolha_campanha',
      topic: 'campanha',
    }),
    shouldUseAI: false,
  };
}


// ============================================
// FLUXO: AGENDA
// ============================================

/**
 * Extrai o periodo da mensagem do usuario (hoje, amanha, semana)
 */
function extractPeriodo(text: string): { dias: number; label: string } {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('hoje')) {
    return { dias: 1, label: 'hoje' };
  }
  if (lowerText.includes('amanh')) {
    return { dias: 2, label: 'amanha' };
  }
  if (lowerText.includes('semana')) {
    return { dias: 7, label: 'da semana' };
  }
  // Default: proximos 7 dias
  return { dias: 7, label: 'da semana' };
}

/**
 * Formata uma data para exibicao
 */
function formatarDataAtividade(dataStr: string): string {
  const data = new Date(dataStr);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const dataAtividade = new Date(data);
  dataAtividade.setHours(0, 0, 0, 0);

  if (dataAtividade.getTime() === hoje.getTime()) {
    return 'Hoje';
  }
  if (dataAtividade.getTime() === amanha.getTime()) {
    return 'Amanha';
  }

  const diasSemana = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];
  const dia = data.getDate().toString().padStart(2, '0');
  const mes = (data.getMonth() + 1).toString().padStart(2, '0');
  return `${diasSemana[data.getDay()]} ${dia}/${mes}`;
}

/**
 * Formata horario de uma atividade
 */
function formatarHorarioAtividade(dataStr: string): string {
  const data = new Date(dataStr);
  const hora = data.getHours().toString().padStart(2, '0');
  const minutos = data.getMinutes().toString().padStart(2, '0');
  return `${hora}:${minutos}`;
}

/**
 * Mapeia tipo de atividade para emoji
 */
function getAtividadeEmoji(tipo: string | undefined): string {
  const tipoLower = (tipo || '').toLowerCase();
  if (tipoLower.includes('visita')) return '🏠';
  if (tipoLower.includes('ligacao') || tipoLower.includes('ligação')) return '📞';
  if (tipoLower.includes('reuniao') || tipoLower.includes('reunião')) return '👥';
  if (tipoLower.includes('email')) return '📧';
  if (tipoLower.includes('tarefa')) return '📋';
  if (tipoLower.includes('lembrete')) return '⏰';
  return '📅';
}

/**
 * Busca nome do lead/cliente associado a atividade
 */
async function buscarNomeLead(leadId: number | undefined, workspaceId?: number): Promise<string | null> {
  if (!leadId) return null;
  try {
    if (workspaceId) {
      const { rows } = await withTenant(workspaceId, async (client) => {
        return client.query(
          `SELECT nome FROM cvcrm_leads WHERE cvcrm_id = $1 AND workspace_id = $2 LIMIT 1`,
          [leadId, workspaceId]
        );
      });
      return rows[0]?.nome || null;
    }
    const { rows } = await dbQuery(
      `SELECT nome FROM cvcrm_leads WHERE cvcrm_id = $1 LIMIT 1`,
      [leadId]
    );
    return rows[0]?.nome || null;
  } catch {
    return null;
  }
}

/**
 * Formata uma atividade para exibicao
 */
async function formatarAtividade(atividade: Atividade, workspaceId?: number): Promise<string> {
  const emoji = getAtividadeEmoji(atividade.tipo);
  const horario = atividade.data_inicio ? formatarHorarioAtividade(atividade.data_inicio) : '--:--';
  const titulo = atividade.titulo || atividade.tipo || 'Compromisso';
  const cliente = await buscarNomeLead(atividade.lead_id, workspaceId);

  let linha = `${emoji} *${horario}* - ${titulo}`;
  if (cliente) {
    linha += ` (${cliente})`;
  }
  return linha;
}

/**
 * Parseia data e horario de uma mensagem do usuario
 */
function parseDataHorario(text: string, entities: any): { data: Date; horario: string } | null {
  const hoje = new Date();
  let data: Date;
  let horario = '09:00';

  // Extrair data
  if (entities.data === 'hoje') {
    data = new Date(hoje);
  } else if (entities.data === 'amanha') {
    data = new Date(hoje);
    data.setDate(data.getDate() + 1);
  } else if (entities.data && entities.data.includes('/')) {
    const [dia, mes, ano] = entities.data.split('/');
    data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
  } else {
    // Se nao especificou, usa hoje
    data = new Date(hoje);
  }

  // Extrair horario
  if (entities.horario) {
    if (entities.horario.includes(':')) {
      horario = entities.horario;
    } else if (entities.horario === 'manha') {
      horario = '09:00';
    } else if (entities.horario === 'tarde') {
      horario = '14:00';
    } else if (entities.horario === 'noite') {
      horario = '19:00';
    }
  }

  // Combinar data e horario
  const [hora, minuto] = horario.split(':').map(Number);
  data.setHours(hora, minuto, 0, 0);

  return { data, horario };
}

/**
 * Handler do fluxo de agenda
 *
 * Permite:
 * 1. Consultar compromissos (hoje, amanha, semana)
 * 2. Agendar novos compromissos/visitas/lembretes
 */
async function handleAgendaFlow(
  user: User,
  text: string,
  context: ConversationContext
): Promise<FlowResult> {
  const intent = detectIntent(text);
  const messages: string[] = [];

  // Obter corretor ID do CVCRM
  const corretorId = await getCorretorIdByUserId(user.id);
  if (!corretorId) {
    messages.push('Nao consegui encontrar seu cadastro de corretor. Fale com seu gerente para regularizar.');
    return {
      messages,
      context,
      shouldUseAI: false,
    };
  }

  // ============================================
  // FLUXO: CRIAR AGENDAMENTO
  // ============================================

  // Se esta aguardando dados para criar agendamento
  if (context.awaiting_response === 'agenda_descricao') {
    // Usuario forneceu a descricao do agendamento
    const descricao = text.trim();

    messages.push(`Anotado! E pra quando? (Pode ser "hoje 14h", "amanha 10h", "segunda 15h")`);

    return {
      messages,
      context: updateContext(context, {
        flow: 'general',
        step: 2,
        awaiting: 'agenda_data_hora',
        entities: { ...context.entities, agendamentoDescricao: descricao },
      }),
      shouldUseAI: false,
    };
  }

  if (context.awaiting_response === 'agenda_data_hora') {
    // Usuario forneceu data e horario
    const parsed = parseDataHorario(text, intent.entities);
    const descricao = (context.entities as any).agendamentoDescricao || 'Lembrete';

    if (!parsed) {
      messages.push('Nao entendi a data/horario. Pode repetir? (ex: "amanha 15h", "segunda 10h")');
      return { messages, context, shouldUseAI: false };
    }

    // Criar o lembrete via actions.ts
    const resultado = await criarLembrete(
      user.id,
      descricao,
      parsed.data,
      { priority: 'medium' }
    );

    if (resultado.success) {
      const dataFormatada = formatarDataAtividade(parsed.data.toISOString());
      messages.push(`Pronto! Agendei pra voce: 📅`);
      messages.push(`*${descricao}*\n${dataFormatada} as ${parsed.horario}`);
      messages.push(`Vou te lembrar na hora! 😉`);
    } else {
      messages.push(`Ops, nao consegui agendar. ${resultado.error || 'Tenta de novo mais tarde.'}`);
    }

    return {
      messages,
      context: updateContext(context, {
        flow: null,
        step: 0,
        awaiting: null,
        entities: {},
      }),
      shouldUseAI: false,
    };
  }

  // ============================================
  // FLUXO: AGENDAR NOVO COMPROMISSO
  // ============================================

  if (intent.intent === 'agenda_visita' || intent.intent === 'agenda_compromisso') {
    // Usuario quer agendar algo novo
    messages.push('Beleza! O que voce quer agendar? Me conta o que e e eu ja registro aqui.');

    return {
      messages,
      context: updateContext(context, {
        flow: 'general',
        step: 1,
        awaiting: 'agenda_descricao',
        topic: 'agenda',
      }),
      shouldUseAI: false,
    };
  }

  // ============================================
  // FLUXO: CONSULTAR AGENDA
  // ============================================

  // Extrair periodo da mensagem
  const periodo = extractPeriodo(text);

  // Buscar atividades do corretor
  const { atividades, agrupado_por_dia } = await getProximasAtividades(
    corretorId.toString(),
    periodo.dias
  );

  await registrarAtividade(
    user.id,
    'Consulta de agenda via WhatsApp',
    `Periodo ${periodo.label}. ${atividades.length} compromissos encontrados.`
  );

  if (atividades.length === 0) {
    // Sem compromissos
    messages.push(AGENDA.semCompromissos(user.nome));
    messages.push('Quer que eu agende algo pra voce? Eu registro por aqui mesmo.');

    return {
      messages,
      context: updateContext(context, {
        flow: 'general',
        topic: 'agenda',
        awaiting: null,
      }),
      shouldUseAI: false,
      followUp: async (phone: string) => {
        await delay(500);
        await askAction(phone, 'O que quer fazer?', [
          { id: 'agendar', emoji: '📅', label: 'Agendar' },
          { id: 'buscar', emoji: '🏠', label: 'Imoveis' },
          { id: 'simular', emoji: '💰', label: 'Simular' },
        ]);
      },
    };
  }

  // Com compromissos
  messages.push(AGENDA.comCompromissos(user.nome, atividades.length));

  // Agrupar por dia e formatar
  const diasOrdenados = Object.keys(agrupado_por_dia).sort();

  for (const dia of diasOrdenados) {
    const atividadesDoDia = agrupado_por_dia[dia];
    const dataLabel = formatarDataAtividade(dia);

    const linhasAtividades: string[] = [];
    for (const atividade of atividadesDoDia) {
      const linha = await formatarAtividade(atividade, user.workspace_id);
      linhasAtividades.push(linha);
    }

    messages.push(`\n*${dataLabel}*\n${linhasAtividades.join('\n')}`);
  }

  messages.push('\nQuer agendar algo mais? E so me dizer!');

  return {
    messages,
    context: updateContext(context, {
      flow: null,
      topic: 'agenda',
      awaiting: null,
    }),
    shouldUseAI: false,
  };
}

// ============================================
// PROCESSADOR PRINCIPAL
// ============================================

/**
 * Contexto adicional para eventos
 */
interface EventoContextParam {
  eventoContext: {
    evento: {
      id: string;
      nome: string;
      descricao?: string;
      data_hora: Date | string;
      local: string;
    };
    convidado: {
      id: string;
      nome: string;
      status: string;
    };
  };
  eventoPrompt: string;
}

export async function processMessage(
  user: User,
  text: string,
  agentConfig?: AgentConfig,
  eventoParams?: EventoContextParam
): Promise<void> {
  const phone = user.telefone;

  // Sanitizar mensagem
  const sanitizedText = sanitizeMessage(text);

  // Verificação de segurança (prompt injection, dados confidenciais, etc)
  const securityCheck = checkSecurity(sanitizedText);
  if (securityCheck.blocked) {
    // Log para análise
    console.warn('[Sofia Security]', {
      userId: user.id,
      reason: securityCheck.reason,
      triggers: securityCheck.triggers,
    });

    // Enviar resposta padrão de bloqueio
    if (securityCheck.response) {
      await sendTextMessage(phone, securityCheck.response);
    }

    // Se deve escalar (dados confidenciais, assédio, ilegal), notificar gerente
    if (securityCheck.shouldEscalate && user.gerente_id) {
      const gerenteResult = await dbQuery(
        'SELECT telefone, nome FROM users WHERE id = $1',
        [user.gerente_id]
      );
      if (gerenteResult.rows[0]?.telefone) {
        const alertMsg = `⚠️ Alerta de Segurança Sofia\n\nCorretor: ${user.nome}\nMotivo: ${securityCheck.reason}\nMensagem: "${text.substring(0, 100)}..."`;
        await sendTextMessage(gerenteResult.rows[0].telefone, alertMsg);
      }
    }

    return;
  }

  // Verificar frustração alta adicional
  const frustrationCheck = checkHighFrustration(sanitizedText);

  // Buscar/criar conversa (com isolamento workspace)
  const { id: convId, messages, context: rawContext } =
    await getOrCreateConversation(user.id, user.workspace_id);

  let context = rawContext;

  // Se frustração alta detectada pelo filtro adicional, aumentar nível
  if (frustrationCheck.isHighFrustration) {
    context = updateContext(context, {
      frustration: Math.min(10, (context.frustration_level || 0) + 4),
    });
  }

  // ============================================
  // ⭐ NOVO: FLUXO DE VENDA DE IMÓVEL (PRIORITÁRIO)
  // ============================================
  // Processar com Sofia Vendedor ANTES de qualquer outra coisa
  const vendaResult = await processarTextoVenda(
    sanitizedText,
    user,
    context,
    user.nome,
    user.telefone,
    user.workspace_id || 0
  );

  if (vendaResult.isVendaFlow) {
    // É fluxo de venda! Usar respostas agressivas
    await sendSplitMessages(phone, vendaResult.messages);
    
    if (vendaResult.followUp) {
      await vendaResult.followUp(phone);
    }
    
    // Atualizar contexto e mensagens
    context = vendaResult.context;
    let updatedMessages = addMessage(messages, 'user', text);
    for (const msg of vendaResult.messages) {
      updatedMessages = addMessage(updatedMessages, 'assistant', msg);
    }
    
    // Salvar conversa
    await saveConversation(convId, updatedMessages, context);
    
    console.log('[Sofia Vendedor] Fluxo de venda processado com sucesso');
    return; // ⭐ IMPORTANTE: Não processar com IA normal
  }
  // ============================================
  // FIM DO FLUXO DE VENDA
  // ============================================

  // Detectar intent e sentimento
  const intentResult = detectIntent(sanitizedText);
  const sentimentResult = analyzeSentiment(sanitizedText, context.frustration_level);

  // Atualizar contexto com detecção
  context = updateContext(context, {
    intent: intentResult.intent,
    category: intentResult.category,
    sentiment: sentimentResult.sentiment,
    entities: intentResult.entities,
    frustration: sentimentResult.frustrationLevel,
  });

  // Adicionar mensagem do usuário
  let updatedMessages = addMessage(messages, 'user', text, {
    intent: intentResult.intent,
    sentiment: sentimentResult.sentiment,
  });

  // Verificar se precisa escalar
  if (
    shouldEscalate(context.sentiment_history, context.frustration_level) &&
    !context.escalated
  ) {
    const result = await handleSupportFlow(
      user,
      'quero falar com alguém',
      context,
      'negative'
    );
    await sendSplitMessages(phone, result.messages);
    context = result.context;

    for (const msg of result.messages) {
      updatedMessages = addMessage(updatedMessages, 'assistant', msg);
    }

    await saveConversation(convId, updatedMessages, context);
    return;
  }

  // Mostrar empatia se sentimento negativo
  if (sentimentResult.recommendations.showEmpathy) {
    const empathy = getEmpathyMessage(sentimentResult.sentiment);
    if (empathy) {
      await sendTextMessage(phone, empathy);
      updatedMessages = addMessage(updatedMessages, 'assistant', empathy);
      await delay(1000);
    }
  }

  if (context.awaiting_response === 'call_confirm') {
    if (isNegative(sanitizedText)) {
      const msg = 'Tranquilo. Se preferir, me chama por aqui que eu destravo com você.';
      await sendTextMessage(phone, msg);
      updatedMessages = addMessage(updatedMessages, 'assistant', msg);
      context = updateContext(context, { awaiting: null });
      await saveConversation(convId, updatedMessages, context);
      return;
    }

    if (isAffirmative(sanitizedText)) {
      const toNumber = await startVoiceCall(user);
      if (toNumber) {
        const msg = `Fechado! Vou te ligar agora no ${toNumber}.`;
        await sendTextMessage(phone, msg);
        updatedMessages = addMessage(updatedMessages, 'assistant', msg);
      } else {
        const msg = 'Ainda nao consegui iniciar a ligacao. Me chama que eu configuro aqui.';
        await sendTextMessage(phone, msg);
        updatedMessages = addMessage(updatedMessages, 'assistant', msg);
      }
      context = updateContext(context, { awaiting: null });
      await saveConversation(convId, updatedMessages, context);
      return;
    }
  }

  // Resposta aguardando envio de fotos do empreendimento
  if (context.awaiting_response === 'empreendimento_fotos') {
    const empreendimentoId = context.entities.empreendimento;
    if (!empreendimentoId) {
      context = updateContext(context, { awaiting: null });
      await saveConversation(convId, updatedMessages, context);
      return;
    }

    if (isNegative(sanitizedText)) {
      const msg = 'Fechado! Se quiser tabela, material ou simulação é só me pedir.';
      await sendTextMessage(phone, msg);
      updatedMessages = addMessage(updatedMessages, 'assistant', msg);
      context = updateContext(context, { awaiting: null });
      await saveConversation(convId, updatedMessages, context);
      return;
    }

    if (isAffirmative(sanitizedText)) {
      const empreendimento = await getEmpreendimentoById(String(empreendimentoId), user.workspace_id);
      if (empreendimento) {
        const media = getEmpreendimentoMedia(empreendimento);
        if (media.images.length > 0) {
          const images = media.images.slice(0, 3);
          for (let i = 0; i < images.length; i += 1) {
            await sendImage(phone, images[i], i === 0 ? `📸 *${empreendimento.nome}*` : undefined);
            await delay(500);
          }
        } else if (media.book) {
          await sendDocument(phone, media.book.url, media.book.fileName, `📘 *${empreendimento.nome}* - Book completo`);
        } else {
          const msg = 'Ainda nao tenho fotos cadastradas desse empreendimento.';
          await sendTextMessage(phone, msg);
          updatedMessages = addMessage(updatedMessages, 'assistant', msg);
        }
      }
      context = updateContext(context, { awaiting: null });
      await saveConversation(convId, updatedMessages, context);
      return;
    }
  }

  // Busca direta de empreendimento quando o usuario pede informacoes
  if (!isInActiveFlow(context)) {
    const wantsEmpInfo = /saber|sobre|info|informac|detalh|conhecer|me fala|me fale/i.test(text);
    let empreendimento = await findEmpreendimentoByText(text, user.workspace_id);
    if (!empreendimento && wantsEmpInfo) {
      empreendimento = await findEmpreendimentoByRag(text, user.workspace_id);
    }
    if (empreendimento) {
      const resumo = formatEmpreendimentoResumo(empreendimento);
      const empreendimentoId = String(empreendimento.cvcrm_id);
      const messages = [
        resumo,
        'Posso ja registrar o interesse e te mandar tabela, fotos ou simulacao.',
        'Me diz o perfil do cliente (quartos, faixa e entrada) que eu te indico a melhor unidade.',
      ];
      await registerEmpreendimentoInteracao(
        user.id,
        { id: empreendimentoId, nome: empreendimento.nome || 'Empreendimento' },
        'resumo',
        messages.join('\n'),
        context,
        user.workspace_id
      );
      const directResult: FlowResult = {
        messages,
        context: updateContext(context, {
          flow: 'search',
          step: 2,
          awaiting: 'empreendimento_fotos',
          entities: { ...context.entities, empreendimento: empreendimentoId },
        }),
        shouldUseAI: false,
        followUp: async (phone: string) => {
          await delay(400);
          await askAction(phone, 'Escolhe o próximo passo:', [
            { id: 'tabela', emoji: '📊', label: 'Tabela' },
            { id: 'unidades', emoji: '🏢', label: 'Unidades' },
            { id: 'material', emoji: '📎', label: 'Material' },
            { id: 'simular', emoji: '💰', label: 'Simular' },
          ]);
        },
      };

      if (directResult.messages.length > 0) {
        await sendSplitMessages(phone, directResult.messages);
        for (const msg of directResult.messages) {
          updatedMessages = addMessage(updatedMessages, 'assistant', msg);
        }
      }

      const location = buildEmpreendimentoLocation(empreendimento);
      if (location) {
        await sendLocation(phone, location);
      }

      await delay(400);
      await askYesNo(phone, 'Quer que eu envie as fotos do empreendimento?', 'fotos');

      context = directResult.context;
      if (directResult.followUp) {
        await directResult.followUp(phone);
      }

      await saveConversation(convId, updatedMessages, context);
      return;
    }
  }

  // Processar fluxo baseado na categoria
  let flowResult: FlowResult | null = null;

  switch (intentResult.category) {
    case 'SAUDACAO':
      if (isSimpleGreeting(text)) {
        flowResult = await handleGreeting(user, context, agentConfig);
      }
      break;

    case 'BUSCA_IMOVEL':
      flowResult = await handleSearchFlow(user, text, context);
      break;

    case 'SIMULACAO':
      flowResult = await handleSimulationFlow(user, text, context);
      break;

    case 'TABELA_PRECO':
    case 'MATERIAL':
      if (intentResult.intent === 'price_compare' && !context.entities.empreendimento) {
        flowResult = await handleCheapestPriceFlow(user, context);
      } else if (context.entities.empreendimento) {
        flowResult = await handleSearchFlow(user, text, context);
      } else {
        const link = buildEmpreendimentosListLink();
        flowResult = {
          messages: ['Pra eu te dar o preco certo e registrar no sistema, escolhe o empreendimento:'],
          context,
          shouldUseAI: false,
          followUp: async (phone: string) => {
            await delay(300);
            await sendActionButtons(phone, 'Abrir no app', [
              { type: 'URL', label: 'Abrir Empreendimentos', url: link },
            ]);
          },
        };
      }
      break;

    case 'SUPORTE':
      if (intentResult.intent === 'support_call') {
        flowResult = {
          messages: ['Quer que eu te ligue agora?'],
          context: updateContext(context, { awaiting: 'call_confirm' }),
          shouldUseAI: false,
          followUp: async (phone: string) => {
            await delay(300);
            await askYesNo(phone, 'Posso te ligar agora?', 'call');
          },
        };
      } else {
        flowResult = await handleSupportFlow(
          user,
          sanitizedText,
          context,
          sentimentResult.sentiment
        );
      }
      break;

    case 'FEEDBACK':
      flowResult = handleFeedback(
        user,
        sanitizedText,
        context,
        sentimentResult.sentiment
      );
      break;

    case 'META':
      if (intentResult.intent === 'meta_identity') {
        flowResult = {
          messages: [SAUDACOES.identidade()],
          context,
          shouldUseAI: false,
        };
      } else if (intentResult.intent === 'meta_capabilities') {
        flowResult = {
          messages: [SAUDACOES.capacidades()],
          context,
          shouldUseAI: false,
        };
      }
      break;

    case 'METAS':
      flowResult = await handleMetasFlow(user, sanitizedText, context);
      break;

    case 'CONCORRENCIA':
      flowResult = await handleConcorrenciaFlow(user, sanitizedText, context);
      break;

    case 'STATUS_PROCESSO':
      flowResult = await handleStatusFlow(user, sanitizedText, context);
      break;

    case 'COMISSAO':
      flowResult = await handleComissaoFlow(user, sanitizedText, context);
      break;

    case 'OBJECAO':
      flowResult = await handleObjecaoFlow(user, sanitizedText, context);
      break;

    case 'CAMPANHA':
      flowResult = await handleCampanhaFlow(user, sanitizedText, context);
      break;

    case 'AGENDA':
      flowResult = await handleAgendaFlow(user, sanitizedText, context);
      break;

    case 'AJUDA_APP':
      flowResult = await handleAjudaAppFlow(user, sanitizedText, context);
      break;
  }

  // Se tem resultado do fluxo
  if (flowResult) {
    if (flowResult.messages.length > 0) {
      await sendSplitMessages(phone, flowResult.messages);
      for (const msg of flowResult.messages) {
        updatedMessages = addMessage(updatedMessages, 'assistant', msg);
      }
    }

    context = flowResult.context;

    // Executar followUp se existir (botões, menus, etc)
    if (flowResult.followUp) {
      await flowResult.followUp(phone);
    }

    // Se fluxo indica usar IA para complementar
    if (flowResult.shouldUseAI) {
      const aiResponse = await generateAIResponse(
        user,
        sanitizedText,
        context,
        updatedMessages,
        sentimentResult.sentiment,
        undefined, // psychologyAnalysis
        agentConfig,
        eventoParams?.eventoPrompt
      );
      await sendSplitMessages(phone, [aiResponse]);
      updatedMessages = addMessage(updatedMessages, 'assistant', aiResponse);
    }
  } else {
    // Sem fluxo específico - usar IA
    const aiResponse = await generateAIResponse(
      user,
      sanitizedText,
      context,
      updatedMessages,
      sentimentResult.sentiment,
      undefined, // psychologyAnalysis
      agentConfig,
      eventoParams?.eventoPrompt
    );
    await sendSplitMessages(phone, [aiResponse]);
    updatedMessages = addMessage(updatedMessages, 'assistant', aiResponse);
  }

  // Salvar conversa
  await saveConversation(convId, updatedMessages, context);
}

// ============================================
// HANDLER PARA USUÁRIO NÃO CADASTRADO
// ============================================

export async function handleUnregisteredUser(phone: string): Promise<void> {
  const normalizedPhone = normalizePhone(phone);
  await sendTextMessage(normalizedPhone, NAO_CADASTRADO.mensagem());
  await delay(1500);
  await sendTextMessage(normalizedPhone, NAO_CADASTRADO.instrucao());
}

// ============================================
// CADASTRO CONVERSACIONAL (USUÁRIO NÃO CADASTRADO)
// ============================================

function sanitizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function extractName(text: string): string | null {
  const cleaned = sanitizeText(
    text
      .replace(/^(meu nome e|meu nome é|me chamo|sou o|sou a|aqui e|aqui é)\s+/i, '')
      .trim()
  );

  if (cleaned.length < 2) return null;
  if (cleaned.length > 80) return cleaned.slice(0, 80).trim();
  return cleaned;
}

function isNegative(text: string): boolean {
  const normalized = sanitizeText(text).toLowerCase();
  return (
    normalized === 'nao' ||
    normalized === 'não' ||
    normalized === 'n' ||
    normalized.includes('nao tenho') ||
    normalized.includes('não tenho') ||
    normalized.includes('sem gerente') ||
    normalized.includes('não possuo') ||
    normalized.includes('nao possuo')
  );
}

async function getOrCreateOnboardingLead(
  normalizedPhone: string
): Promise<OnboardingLead> {
  const { rows } = await dbQuery<OnboardingLead>(
    `select * from onboarding_leads where phone = $1 limit 1`,
    [normalizedPhone]
  );
  if (rows[0]) return rows[0];

  const { rows: createdRows } = await dbQuery<OnboardingLead>(
    `insert into onboarding_leads (phone, status, step)
     values ($1, 'collecting', 'name')
     returning *`,
    [normalizedPhone]
  );
  return createdRows[0];
}

async function updateOnboardingLead(
  id: string,
  updates: Partial<OnboardingLead>
): Promise<OnboardingLead> {
  const fields = Object.keys(updates);
  if (fields.length === 0) {
    const { rows } = await dbQuery<OnboardingLead>(
      `select * from onboarding_leads where id = $1 limit 1`,
      [id]
    );
    return rows[0];
  }

  const setClauses = fields.map((field, idx) => `${field} = $${idx + 2}`);
  const values = [id, ...fields.map((f) => (updates as any)[f])];
  const { rows } = await dbQuery<OnboardingLead>(
    `update onboarding_leads
     set ${setClauses.join(', ')}, updated_at = now(), last_message_at = now()
     where id = $1
     returning *`,
    values
  );
  return rows[0];
}

async function resolveImobiliaria(
  input: string
): Promise<{ id: string; nome: string }> {
  type ImobResult = { id: string; nome: string };
  const normalized = sanitizeText(input);
  const lower = normalized.toLowerCase();
  const isAutonomo =
    lower.includes('autonomo') || lower.includes('autônomo');

  if (isAutonomo) {
    const { rows: found } = await dbQuery<ImobResult>(
      `select id, nome from imobiliarias
       where nome ilike $1
       limit 1`,
      ['%Orcioli Realizando Sonhos%']
    );
    if (found[0]) return found[0];

    const { rows: created } = await dbQuery<ImobResult>(
      `insert into imobiliarias (nome, is_active)
       values ($1, true)
       returning id, nome`,
      ['Orcioli Realizando Sonhos']
    );
    return created[0];
  }

  const { rows: existing } = await dbQuery<ImobResult>(
    `select id, nome from imobiliarias
     where nome ilike $1
     limit 1`,
    [`%${normalized}%`]
  );
  if (existing[0]) return existing[0];

  const { rows: created } = await dbQuery<ImobResult>(
    `insert into imobiliarias (nome, is_active)
     values ($1, true)
     returning id, nome`,
    [normalized]
  );
  return created[0];
}

async function resolveGerente(
  input: string,
  imobiliariaId?: string | null
): Promise<{ id?: string; nome?: string } | null> {
  const normalized = sanitizeText(input);
  if (!normalized || isNegative(normalized)) return null;

  const params: any[] = [`%${normalized}%`];
  let query = `select id, nome from users where role = 'gerente' and nome ilike $1`;
  if (imobiliariaId) {
    params.push(imobiliariaId);
    query += ` and imobiliaria_id = $2`;
  }
  query += ` order by nome asc limit 1`;

  const { rows } = await dbQuery(query, params);
  if (rows[0]) return rows[0];
  return { nome: normalized };
}

export async function handleUnregisteredUserConversation(
  phone: string,
  messageText?: string,
  contactName?: string
): Promise<User | null> {
  const normalizedPhone = normalizePhone(phone);
  const lead = await getOrCreateOnboardingLead(normalizedPhone);
  const text = messageText ? sanitizeText(messageText) : '';

  // ============================================
  // INÍCIO: Verificar CV CRM primeiro
  // ============================================
  if (!messageText && lead.step === 'name' && !lead.name) {
    // Micro transição 1: Saudação
    await sendTextMessage(normalizedPhone, CADASTRO.intro1());
    await delay(500);
    
    // Micro transição 2: Contexto
    await sendTextMessage(normalizedPhone, CADASTRO.intro2());
    await delay(700);
    
    // Micro transição 3: CTA
    await sendTextMessage(normalizedPhone, CADASTRO.intro3());
    await delay(800);
    
    // Verificar no CV CRM
    await sendTextMessage(normalizedPhone, CADASTRO.verificando());
    await delay(1000);
    
    // Importar função do CV CRM
    const { findCorretorByPhone } = await import('@/lib/cvcrm-client');
    const cvCRMResult = await findCorretorByPhone(normalizedPhone);
    
    if (cvCRMResult.found && cvCRMResult.nome) {
      // Encontrou no CV CRM!
      await sendTextMessage(normalizedPhone, CADASTRO.encontreiCVCRM(cvCRMResult.nome));
      await delay(600);
      
      // Salvar dados temporários e pedir confirmação
      await updateOnboardingLead(lead.id, {
        name: cvCRMResult.nome,
        imobiliaria_name: cvCRMResult.imobiliaria || null,
        imobiliaria_id: cvCRMResult.imobiliariaId || null,
        step: 'confirm_name',
      });
      
      await sendTextMessage(normalizedPhone, CADASTRO.confirmaNome());
      return null;
    } else {
      // Não encontrou, mas pode ter pego do WhatsApp
      if (contactName && contactName.length > 2) {
        await sendTextMessage(normalizedPhone, CADASTRO.encontreiCVCRM(contactName));
        await delay(600);
        
        await updateOnboardingLead(lead.id, {
          name: contactName,
          step: 'confirm_name',
        });
        
        await sendTextMessage(normalizedPhone, CADASTRO.confirmaNome());
        return null;
      }
      
      // Não encontrou nada, pedir o nome
      await sendTextMessage(normalizedPhone, CADASTRO.pedirNome());
      return null;
    }
  }

  // ============================================
  // CONFIRMAR NOME (novo step)
  // ============================================
  if (lead.step === 'confirm_name') {
    const lower = text.toLowerCase();
    const isConfirming = lower.includes('sim') || lower === 's' || lower === 'é' || lower === 'isso' || lower === 'correto' || lower === 'confirmo';
    
    if (isConfirming) {
      // Nome confirmado!
      await sendTextMessage(normalizedPhone, CADASTRO.bemVindo(lead.name || 'Parceiro'));
      await delay(400);
      await sendTextMessage(normalizedPhone, CADASTRO.progresso1());
      await delay(600);
      
      // Se já tem imobiliária do CV CRM, confirmar
      if (lead.imobiliaria_name) {
        await sendTextMessage(normalizedPhone, CADASTRO.confirmandoImobiliaria(lead.imobiliaria_name));
        await updateOnboardingLead(lead.id, { step: 'confirm_imobiliaria' });
        return null;
      }
      
      // Senão, pedir imobiliária
      await sendTextMessage(normalizedPhone, CADASTRO.verificandoImobiliaria());
      await delay(500);
      await sendTextMessage(normalizedPhone, CADASTRO.pedirImobiliaria());
      await delay(300);
      await sendTextMessage(normalizedPhone, CADASTRO.pedirImobiliariaRapido());
      await updateOnboardingLead(lead.id, { step: 'imobiliaria' });
      return null;
    } else {
      // Usuário corrigiu o nome
      const name = extractName(text);
      if (!name) {
        await sendTextMessage(normalizedPhone, CADASTRO.erroNome());
        return null;
      }
      
      await updateOnboardingLead(lead.id, { name, step: 'name' });
      await sendTextMessage(normalizedPhone, CADASTRO.bemVindo(name));
      await delay(400);
      await sendTextMessage(normalizedPhone, CADASTRO.progresso1());
      await delay(600);
      
      // Continuar para imobiliária
      await sendTextMessage(normalizedPhone, CADASTRO.verificandoImobiliaria());
      await delay(500);
      await sendTextMessage(normalizedPhone, CADASTRO.pedirImobiliaria());
      await delay(300);
      await sendTextMessage(normalizedPhone, CADASTRO.pedirImobiliariaRapido());
      await updateOnboardingLead(lead.id, { step: 'imobiliaria' });
      return null;
    }
  }

  // ============================================
  // CONFIRMAR IMOBILIÁRIA (novo step)
  // ============================================
  if (lead.step === 'confirm_imobiliaria') {
    const lower = text.toLowerCase();
    const isConfirming = lower.includes('sim') || lower === 's' || lower === 'é' || lower === 'isso' || lower === 'correto';
    
    if (isConfirming) {
      await sendTextMessage(normalizedPhone, CADASTRO.acheiImobiliaria(lead.imobiliaria_name || ''));
      await delay(400);
      await sendTextMessage(normalizedPhone, CADASTRO.progresso2());
      await delay(600);
      
      // Perguntar sobre gerente
      await sendTextMessage(normalizedPhone, CADASTRO.ultimaPergunta());
      await delay(500);
      await sendTextMessage(normalizedPhone, CADASTRO.pedirGerente());
      await delay(300);
      await sendTextMessage(normalizedPhone, CADASTRO.pedirGerenteOpcional());
      await updateOnboardingLead(lead.id, { step: 'gerente' });
      return null;
    } else {
      // Usuário corrigiu a imobiliária
      const imobiliaria = await resolveImobiliaria(text);
      await updateOnboardingLead(lead.id, {
        imobiliaria_name: imobiliaria.nome,
        imobiliaria_id: imobiliaria.id,
        step: 'imobiliaria',
      });
      
      await sendTextMessage(normalizedPhone, CADASTRO.acheiImobiliaria(imobiliaria.nome));
      await delay(400);
      await sendTextMessage(normalizedPhone, CADASTRO.progresso2());
      await delay(600);
      
      // Continuar para gerente
      await sendTextMessage(normalizedPhone, CADASTRO.ultimaPergunta());
      await delay(500);
      await sendTextMessage(normalizedPhone, CADASTRO.pedirGerente());
      await delay(300);
      await sendTextMessage(normalizedPhone, CADASTRO.pedirGerenteOpcional());
      await updateOnboardingLead(lead.id, { step: 'gerente' });
      return null;
    }
  }

  // ============================================
  // COLETAR NOME
  // ============================================
  if (lead.step === 'name') {
    const name = extractName(text);
    if (!name) {
      const lower = text.toLowerCase();
      if (isSimpleGreeting(text) || lower.includes('cadastro') || lower.includes('cadastrar')) {
        await sendTextMessage(normalizedPhone, CADASTRO.intro3());
        await delay(600);
        await sendTextMessage(normalizedPhone, CADASTRO.pedirNome());
      } else {
        await sendTextMessage(normalizedPhone, CADASTRO.erroNome());
      }
      return null;
    }

    await updateOnboardingLead(lead.id, { name, step: 'imobiliaria' });
    
    await sendTextMessage(normalizedPhone, CADASTRO.bemVindo(name));
    await delay(400);
    await sendTextMessage(normalizedPhone, CADASTRO.progresso1());
    await delay(600);
    
    await sendTextMessage(normalizedPhone, CADASTRO.verificandoImobiliaria());
    await delay(500);
    await sendTextMessage(normalizedPhone, CADASTRO.pedirImobiliaria());
    await delay(300);
    await sendTextMessage(normalizedPhone, CADASTRO.pedirImobiliariaRapido());
    return null;
  }

  // ============================================
  // COLETAR IMOBILIÁRIA
  // ============================================
  if (lead.step === 'imobiliaria') {
    if (!text) {
      await sendTextMessage(normalizedPhone, CADASTRO.erroImobiliaria());
      return null;
    }

    const imobiliaria = await resolveImobiliaria(text);
    await updateOnboardingLead(lead.id, {
      imobiliaria_name: imobiliaria.nome,
      imobiliaria_id: imobiliaria.id,
      step: 'gerente',
    });

    await sendTextMessage(normalizedPhone, CADASTRO.acheiImobiliaria(imobiliaria.nome));
    await delay(400);
    await sendTextMessage(normalizedPhone, CADASTRO.progresso2());
    await delay(600);
    
    await sendTextMessage(normalizedPhone, CADASTRO.ultimaPergunta());
    await delay(500);
    await sendTextMessage(normalizedPhone, CADASTRO.pedirGerente());
    await delay(300);
    await sendTextMessage(normalizedPhone, CADASTRO.pedirGerenteOpcional());
    return null;
  }

  // ============================================
  // COLETAR GERENTE E FINALIZAR
  // ============================================
  if (lead.step === 'gerente') {
    const gerente = await resolveGerente(text, lead.imobiliaria_id || undefined);
    const updatedLead = await updateOnboardingLead(lead.id, {
      gerente_name: gerente?.nome || null,
      gerente_id: gerente?.id || null,
      step: 'done',
      status: 'ready',
    });

    // Micro transições finais
    await sendTextMessage(normalizedPhone, CADASTRO.progresso3());
    await delay(500);
    await sendTextMessage(normalizedPhone, CADASTRO.processando());
    await delay(800);

    const { rows: createdUserRows } = await dbQuery(
      `insert into users (telefone, nome, role, imobiliaria_id, gerente_id, onboarding_status, is_active)
       values ($1, $2, 'corretor', $3, $4, 'completed', true)
       returning *`,
      [
        normalizedPhone,
        updatedLead.name,
        updatedLead.imobiliaria_id,
        updatedLead.gerente_id,
      ]
    );
    const newUser = createdUserRows[0];

    if (!newUser) {
      await sendTextMessage(normalizedPhone, NAO_CADASTRADO.mensagem());
      return null;
    }

    await updateOnboardingLead(lead.id, {
      status: 'created',
      step: 'done',
    });

    // Celebração!
    await sendTextMessage(normalizedPhone, CADASTRO.sucesso());
    await delay(500);
    await sendTextMessage(normalizedPhone, CADASTRO.confirmacao(newUser.nome));
    await delay(800);
    
    await sendTextMessage(normalizedPhone, CADASTRO.acessoApp());
    await delay(400);
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    if (appUrl) {
      await sendTextMessage(normalizedPhone, CADASTRO.appLink(appUrl));
      await delay(600);
    }
    
    await sendTextMessage(normalizedPhone, CADASTRO.proximoPasso());
    await delay(400);
    await sendTextMessage(normalizedPhone, CADASTRO.opcoes());

    return {
      id: newUser.id,
      nome: newUser.nome,
      telefone: newUser.telefone,
      role: newUser.role,
      gerente_id: newUser.gerente_id,
      imobiliaria_id: newUser.imobiliaria_id,
    };
  }

  await sendTextMessage(normalizedPhone, CADASTRO.pedirNome());
  return null;
}
