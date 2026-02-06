// @ts-nocheck
/**
 * Sofia Vendedor de Imóvel - Sistema Agressivo de Venda via WhatsApp
 *
 * Módulo responsável por transformar Sofia em uma vendedora AGRESSIVA de imóveis.
 * Detecta intenção de compra, busca imóveis em tempo real, oferece com urgência.
 */

import { dbQuery } from '@/lib/db';
import { sendActionButtons, sendQuickButtons, sendTextMessage } from '@/lib/whatsapp-sender';
import { delay } from './persona';
import type { ConversationContext } from './context';

// ============================================================================
// TIPOS
// ============================================================================

export interface FiltrosImovel {
  quartos?: number;
  precoMax?: number;
  precoMin?: number;
  bairro?: string[];
  metrogenMin?: number;
  metragenMax?: number;
  amenidades?: string[];
}

export interface ImovelOferecido {
  id: string;
  nome: string;
  preco: number;
  quartos: number;
  metragem: number;
  bairro: string;
  endereco: string;
  status: string;
  foto?: string;
  disponivel: number;
  piscina?: boolean;
  areaLazer?: boolean;
  academia?: boolean;
  diferenciais: string[];
}

export interface OfertaVenda {
  imoveis: ImovelOferecido[];
  mensagemAbertura: string;
  mensagensDetalhadas: string[];
  botoes: Array<{
    id: string;
    label: string;
    emoji?: string;
  }>;
}

export interface Lead {
  nome: string;
  whatsapp: string;
  imovelInteressado: string;
  filtrosOriginais: FiltrosImovel;
  score: number;
  fonte: 'whatsapp_sofia';
}

// ============================================================================
// DETECTOR DE INTENÇÃO DE COMPRA
// ============================================================================

/**
 * Analisa mensagem e detecta intenção de compra + extrai filtros
 */
export function detectarIntencaoCompra(texto: string): {
  temIntencao: boolean;
  filtros: FiltrosImovel;
  confidence: number;
} {
  const lower = texto.toLowerCase();
  
  // Palavras-chave de compra (agressivo)
  const palavrasCompra = [
    'quero comprar', 'procuro', 'busco', 'tem algum', 'qual a opção',
    'me mostra', 'manda', 'me oferece', 'quero 2q', 'quero um apto',
    'preciso de', 'estou procurando', 'tô procurando', 'to procurando',
    'pode me oferecer', 'qual seria', 'qual é o mais', 'mais barato',
    'mais próximo', 'melhor opção'
  ];

  // Verificar intenção
  const temIntencao = palavrasCompra.some(palavra => lower.includes(palavra));

  if (!temIntencao) {
    return { temIntencao: false, filtros: {}, confidence: 0 };
  }

  // Extrair filtros da mensagem
  const filtros: FiltrosImovel = {};

  // Detectar quartos (2Q, 3Q, 2 quartos, etc)
  const quartoMatch = texto.match(/(\d)\s*[qQ]|(\d)\s*quartos?|(\d)\s*dorm/i);
  if (quartoMatch) {
    filtros.quartos = parseInt(quartoMatch[1] || quartoMatch[2] || quartoMatch[3]);
  }

  // Detectar preço (500k, 500.000, até 500)
  const precoMatch = texto.match(
    /(?:até|ate|max|máximo|maximo)?[\s]*(?:R\$\s*)?(\d+\.?\d*)\s*[km]?/i
  );
  if (precoMatch) {
    let preco = parseFloat(precoMatch[1].replace('.', ''));
    // Se tem 'k' no final, é em milhares
    if (texto.match(/\d+k/i)) {
      preco = preco * 1000;
    }
    // Se tem 'm' no final, é em milhões (raro mas possível)
    if (texto.match(/\d+m/i)) {
      preco = preco * 1000000;
    }
    filtros.precoMax = preco;
  }

  // Detectar bairros (Zona Sul, Zona Norte, etc)
  const bairrosComuns = [
    'zona sul', 'zona norte', 'zona leste', 'zona oeste',
    'centro', 'vila mariana', 'pinheiros', 'consolação',
    'moema', 'ibirapuera', 'santana', 'tatuapé'
  ];
  const bairroDetetado = bairrosComuns.find(b => lower.includes(b));
  if (bairroDetetado) {
    filtros.bairro = [bairroDetetado];
  }

  // Detectar metragem (80m², 100m2, etc)
  const metragemMatch = texto.match(/(\d+)\s*m[²2]?/i);
  if (metragemMatch) {
    filtros.metrogenMin = parseInt(metragemMatch[1]);
  }

  // Detectar amenidades (piscina, área de lazer, academia)
  const amenidades: string[] = [];
  if (lower.includes('piscina')) amenidades.push('piscina');
  if (lower.includes('lazer') || lower.includes('area de lazer')) amenidades.push('areaLazer');
  if (lower.includes('academia') || lower.includes('gym')) amenidades.push('academia');
  if (amenidades.length > 0) {
    filtros.amenidades = amenidades;
  }

  const confidence = Object.keys(filtros).length > 0 ? 0.95 : 0.7;

  return { temIntencao: true, filtros, confidence };
}

// ============================================================================
// BUSCA EM TEMPO REAL DO CVCRM
// ============================================================================

/**
 * Busca imóveis no CVCRM com filtros em tempo real
 * Retorna TOP 3 melhores matches
 */
export async function buscarImovelsCVCRM(filtros: FiltrosImovel): Promise<ImovelOferecido[]> {
  const conditions: string[] = ['status IN (\'disponivel\', \'ativo\', \'em venda\')'];
  const params: any[] = [];
  let paramIndex = 1;

  // Filtro de quartos
  if (filtros.quartos) {
    conditions.push(`(cvcrm_data->>'quartos')::int = $${paramIndex}`);
    params.push(filtros.quartos);
    paramIndex++;
  }

  // Filtro de preço máximo
  if (filtros.precoMax) {
    conditions.push(`(cvcrm_data->>'preco_minimo')::numeric <= $${paramIndex}`);
    params.push(filtros.precoMax);
    paramIndex++;
  }

  // Filtro de preço mínimo
  if (filtros.precoMin) {
    conditions.push(`(cvcrm_data->>'preco_minimo')::numeric >= $${paramIndex}`);
    params.push(filtros.precoMin);
    paramIndex++;
  }

  // Filtro de bairro
  if (filtros.bairro && filtros.bairro.length > 0) {
    const bairroConditions = filtros.bairro.map((_, idx) => 
      `LOWER(cvcrm_data->>'bairro') ILIKE LOWER($${paramIndex + idx})`
    ).join(' OR ');
    conditions.push(`(${bairroConditions})`);
    filtros.bairro.forEach(b => {
      params.push(`%${b}%`);
    });
    paramIndex += filtros.bairro.length;
  }

  // Filtro de metragem mínima
  if (filtros.metrogenMin) {
    conditions.push(`(cvcrm_data->>'metragem_min')::numeric >= $${paramIndex}`);
    params.push(filtros.metrogenMin);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  try {
    const { rows } = await dbQuery(
      `SELECT 
        cvcrm_id as id,
        nome,
        cvcrm_data,
        status,
        cidade,
        uf,
        endereco_completo
      FROM cvcrm_empreendimentos
      WHERE ${whereClause}
      ORDER BY 
        CASE 
          WHEN (cvcrm_data->>'unidades_disponiveis')::int > 0 THEN 0 ELSE 1
        END,
        (cvcrm_data->>'preco_minimo')::numeric ASC
      LIMIT 10`,
      params
    );

    // Enriquecer dados e buscar unidades disponíveis
    const imoveisEnriquecidos: ImovelOferecido[] = [];

    for (const row of rows) {
      const data = row.cvcrm_data || {};
      const precoMin = Number(data.preco_minimo) || 0;
      
      // Buscar unidades disponíveis para este imóvel
      const { rows: unidades } = await dbQuery(
        `SELECT COUNT(*) as total, quartos, area_util as metragem
         FROM cvcrm_unidades
         WHERE id_empreendimento = $1
         AND situacao NOT IN ('V', 'R', 'B')
         GROUP BY quartos, area_util
         ORDER BY quartos, area_util
         LIMIT 3`,
        [row.id]
      );

      const totalDisponivel = unidades.reduce((sum, u) => sum + parseInt(u.total || 0), 0);

      if (totalDisponivel > 0) {
        imoveisEnriquecidos.push({
          id: String(row.id),
          nome: row.nome,
          preco: precoMin,
          quartos: Number(data.quartos) || 0,
          metragem: Number(data.metragem_min) || 0,
          bairro: data.bairro?.nome || data.bairro || '',
          endereco: row.endereco_completo || `${row.cidade}, ${row.uf}`,
          status: row.status,
          foto: data.foto || data.foto_principal,
          disponivel: totalDisponivel,
          piscina: Boolean(data.piscina),
          areaLazer: Boolean(data.area_lazer),
          academia: Boolean(data.academia),
          diferenciais: extrairDiferenciais(data),
        });
      }
    }

    // Ordenar por relevância e retornar TOP 3
    return imoveisEnriquecidos
      .sort((a, b) => {
        // Prioridade: tem todas as amenidades solicitadas
        const aTemAmenidades = filtros.amenidades?.length 
          ? filtros.amenidades.every(a => {
              if (a === 'piscina') return a.piscina;
              if (a === 'areaLazer') return a.areaLazer;
              if (a === 'academia') return a.academia;
              return false;
            }) 
          : true;
        
        const bTemAmenidades = filtros.amenidades?.length 
          ? filtros.amenidades.every(a => {
              if (a === 'piscina') return b.piscina;
              if (a === 'areaLazer') return b.areaLazer;
              if (a === 'academia') return b.academia;
              return false;
            })
          : true;

        if (aTemAmenidades !== bTemAmenidades) {
          return aTemAmenidades ? -1 : 1;
        }

        // Depois por disponibilidade
        if (a.disponivel !== b.disponivel) {
          return b.disponivel - a.disponivel;
        }

        // Por fim por preço
        return a.preco - b.preco;
      })
      .slice(0, 3);
  } catch (error) {
    console.error('[Sofia Vendedor] Erro ao buscar imóveis:', error);
    return [];
  }
}

// ============================================================================
// CONSTRUTOR DE MENSAGEM AGRESSIVA
// ============================================================================

/**
 * Cria oferta AGRESSIVA com emojis, urgência e CTAs claros
 */
export function construirOfertaAgressiva(
  imoveis: ImovelOferecido[],
  filtros: FiltrosImovel
): OfertaVenda {
  const mensagens: string[] = [];
  const botoes: Array<{ id: string; label: string; emoji?: string }> = [];

  // Abertura agressiva com urgência
  const abertura = imoveis.length > 0
    ? `🔥 ACHEI ${imoveis.length} OPÇÕES INCRÍVEIS PRA VOCÊ! 🔥`
    : `😍 DEIXA EU PROCURAR PRO SEU PERFIL AGORA...`;

  // Detalhar cada imóvel com urgência
  let contador = 1;
  for (const imovel of imoveis) {
    const linhas: string[] = [];
    linhas.push(`\n[${contador}️⃣] *${imovel.nome.toUpperCase()}*`);
    linhas.push(`💰 ${formatarPreco(imovel.preco)}`);
    linhas.push(`📍 ${imovel.bairro} • ${imovel.endereco.split(',')[0]}`);
    linhas.push(`📐 ${imovel.metragem}m² • ${imovel.quartos}Q`);
    
    // Amenidades destacadas
    const amenidadesStr = [
      imovel.piscina ? '🏊 Piscina' : null,
      imovel.areaLazer ? '🎾 Área Lazer' : null,
      imovel.academia ? '💪 Academia' : null,
    ].filter(Boolean).join(' • ');
    
    if (amenidadesStr) {
      linhas.push(`✨ ${amenidadesStr}`);
    }
    
    linhas.push(`✅ ${imovel.disponivel} unidades disponíveis AGORA`);
    
    mensagens.push(linhas.join('\n'));
    
    // Botões de ação por imóvel
    botoes.push({
      id: `agendar_${imovel.id}`,
      label: `Agendar Visita - ${imovel.nome.substring(0, 20)}`,
      emoji: '📅',
    });
    
    botoes.push({
      id: `detalhes_${imovel.id}`,
      label: `Mais Detalhes - ${imovel.nome.substring(0, 15)}`,
      emoji: '📋',
    });
    
    contador++;
  }

  // Mensagem de fechamento com urgência
  const fechamento = `\n⏰ *ESSES VALORES SÃO HOJE* ⏰\nOs melhores imóveis VÃO RÁPIDO!\n\nQual te interessa? Posso agendar HOJE! 🚀`;

  const todasMensagens = [abertura, ...mensagens, fechamento];

  return {
    imoveis,
    mensagemAbertura: abertura,
    mensagensDetalhadas: todasMensagens,
    botoes,
  };
}

/**
 * Formata preço em português
 */
function formatarPreco(preco: number): string {
  if (preco >= 1000000) {
    return `R$ ${(preco / 1000000).toFixed(1).replace('.', ',')}M`;
  }
  if (preco >= 1000) {
    return `R$ ${(preco / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}k`;
  }
  return `R$ ${preco.toLocaleString('pt-BR')}`;
}

/**
 * Extrai diferenciais do objeto CVCRM
 */
function extrairDiferenciais(data: any): string[] {
  const difs: string[] = [];
  
  if (data.piscina) difs.push('Piscina');
  if (data.area_lazer) difs.push('Área de Lazer');
  if (data.academia) difs.push('Academia');
  if (data.coworking) difs.push('Coworking');
  if (data.pet_friendly) difs.push('Pet Friendly');
  if (data.lounge) difs.push('Lounge');
  if (data.salao_festas) difs.push('Salão de Festas');
  if (data.quadra_esportes) difs.push('Quadra de Esportes');
  if (data.parque) difs.push('Parque');
  if (data.estacionamento) difs.push('Estacionamento');
  
  return difs;
}

// ============================================================================
// ENVIO DE OFERTA VIA WHATSAPP
// ============================================================================

/**
 * Envia oferta agressiva via WhatsApp com botões de ação
 */
export async function enviarOfertaVenda(
  telefone: string,
  oferta: OfertaVenda
): Promise<void> {
  // Enviar cada mensagem com delay humanizado
  for (let i = 0; i < oferta.mensagensDetalhadas.length; i++) {
    const msg = oferta.mensagensDetalhadas[i];
    const typingSeconds = Math.min(15, Math.max(1, Math.round(msg.length / 50)));
    
    await sendTextMessage(telefone, msg, { delayTyping: typingSeconds });
    
    // Delay entre mensagens
    if (i < oferta.mensagensDetalhadas.length - 1) {
      await delay(800);
    }
  }

  // Enviar botões de ação após todas as mensagens
  await delay(1000);
  
  // Agrupar botões em lotes (WhatsApp tem limite)
  const botoesAgrupados = oferta.botoes.slice(0, 3);
  
  for (const botao of botoesAgrupados) {
    const label = botao.emoji 
      ? `${botao.emoji} ${botao.label.substring(0, 25)}`
      : botao.label.substring(0, 27);
    
    await sendQuickButtons(telefone, label, [
      { id: botao.id, text: label },
    ]);
    
    await delay(300);
  }
}

// ============================================================================
// CAPTURA DE LEAD
// ============================================================================

/**
 * Pergunta dados do lead após demonstração de interesse
 */
export async function solicitarDadosLead(telefone: string): Promise<void> {
  const msg = `Para eu finalizar aqui e te mandar tudo direitinho, qual seu nome? 👤`;
  await sendTextMessage(telefone, msg);
}

/**
 * Cria lead no banco com dados coletados
 */
export async function criarLeadVendedor(
  lead: Lead,
  workspaceId: number
): Promise<{ id: string; sucesso: boolean; mensagem: string }> {
  try {
    // Inserir lead na tabela
    const { rows } = await dbQuery(
      `INSERT INTO cvcrm_leads (
        workspace_id,
        nome,
        telefone,
        celular,
        origem,
        situacao_nome,
        score,
        empreendimentos,
        data_cadastro_cvcrm,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id`,
      [
        workspaceId,
        lead.nome,
        lead.whatsapp.replace(/\D/g, ''),
        lead.whatsapp.replace(/\D/g, ''),
        'WhatsApp Sofia Vendedor',
        'Novo Lead - Interesse em Imóvel',
        lead.score,
        JSON.stringify([lead.imovelInteressado]),
      ]
    );

    return {
      id: rows[0]?.id || 'unknown',
      sucesso: true,
      mensagem: `Lead ${lead.nome} criado com sucesso!`,
    };
  } catch (error) {
    console.error('[Sofia Vendedor] Erro ao criar lead:', error);
    return {
      id: 'error',
      sucesso: false,
      mensagem: `Erro ao criar lead: ${error instanceof Error ? error.message : 'desconhecido'}`,
    };
  }
}

/**
 * Calcula score automático do lead
 */
export function calcularScoreLead(filtros: FiltrosImovel): number {
  let score = 50; // Base 50

  // Mais filtros específicos = mais qualificado
  if (filtros.quartos) score += 10;
  if (filtros.precoMax) score += 10;
  if (filtros.precoMin) score += 5;
  if (filtros.bairro && filtros.bairro.length > 0) score += 15;
  if (filtros.metrogenMin) score += 10;
  if (filtros.amenidades && filtros.amenidades.length > 0) score += 10;

  return Math.min(100, score);
}

// ============================================================================
// CONTEXTO PARA SOFIA VENDEDOR PROMPT
// ============================================================================

/**
 * Cria contexto especializado para Sofia Vendedor
 */
export function construirContextoVendedor(
  nomeCliente: string,
  filtros: FiltrosImovel,
  imoveis: ImovelOferecido[]
): string {
  const linhas: string[] = [];

  linhas.push('## CONTEXTO DE VENDA IMÓVEL');
  linhas.push(`Cliente: ${nomeCliente}`);
  linhas.push(`Intenção: Compra de imóvel`);
  linhas.push(`Score: ${calcularScoreLead(filtros)}/100`);

  linhas.push('\n### Preferências do Cliente:');
  if (filtros.quartos) linhas.push(`- Quartos: ${filtros.quartos}Q`);
  if (filtros.precoMax) linhas.push(`- Até: R$ ${formatarPreco(filtros.precoMax)}`);
  if (filtros.bairro) linhas.push(`- Bairro: ${filtros.bairro.join(', ')}`);
  if (filtros.amenidades) linhas.push(`- Amenidades: ${filtros.amenidades.join(', ')}`);

  linhas.push('\n### Imóveis Disponíveis:');
  for (const imov of imoveis) {
    linhas.push(`- ${imov.nome}: R$ ${formatarPreco(imov.preco)} | ${imov.quartos}Q | ${imov.metragem}m²`);
  }

  linhas.push('\n### INSTRUÇÕES ESPECIAIS PARA SOFIA:');
  linhas.push('1. SER AGRESSIVA: Use urgência ("HOJE", "AGORA", "RÁPIDO")');
  linhas.push('2. DESTACAR VALOR: Mostre benefícios, não só números');
  linhas.push('3. CRIAR FOMO: "Os melhores saem rápido"');
  linhas.push('4. FECHAR: Sempre ofereça próximo passo (agendar, mais info)');
  linhas.push('5. EMOJIS: Use 🔥💰📍✨ para destacar');

  return linhas.join('\n');
}
