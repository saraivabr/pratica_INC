/**
 * Funções para formatar mensagens do WhatsApp
 * para compartilhamento de empreendimentos
 */

import { formatCurrency } from './data';

export interface EmpreendimentoData {
  id: string;
  nome: string;
  cidade?: string;
  bairro?: string;
  construtora?: string;
  previsaoEntrega?: string;
  tipo?: string;
  descricao?: string;
  diferenciais?: string[];
  precoMinimo?: number;
  precoMaximo?: number;
}

export interface UnidadeData {
  id: string;
  tipo: string;
  metragem: number;
  valor: number;
  status: string;
  quartos: number;
  vagas: number;
  andar?: number;
  final?: string;
}

export interface SimulacaoData {
  valorImovel: number;
  entrada: number;
  percentualEntrada: number;
  valorFinanciado: number;
  prazoMeses: number;
  taxaAnual: number;
  parcelaMensal: number;
  totalPago: number;
  totalJuros: number;
}

/**
 * Formata mensagem de resumo executivo do empreendimento
 */
export function formatResumoExecutivo(empreendimento: EmpreendimentoData, unidades: UnidadeData[]): string {
  const disponiveis = unidades.filter(u => u.status === 'disponivel').length;
  const total = unidades.length;

  let msg = `🏢 *${empreendimento.nome}*\n\n`;

  // Localização
  if (empreendimento.bairro || empreendimento.cidade) {
    msg += `📍 ${[empreendimento.bairro, empreendimento.cidade].filter(Boolean).join(', ')}\n`;
  }

  // Construtora
  if (empreendimento.construtora) {
    msg += `🏗️ ${empreendimento.construtora}\n`;
  }

  // Previsão de entrega
  if (empreendimento.previsaoEntrega) {
    msg += `📅 Entrega: ${empreendimento.previsaoEntrega}\n`;
  }

  msg += `\n`;

  // Preço
  if (empreendimento.precoMinimo && empreendimento.precoMaximo) {
    msg += `💰 *Valores*\n`;
    msg += `De ${formatCurrency(empreendimento.precoMinimo)} a ${formatCurrency(empreendimento.precoMaximo)}\n\n`;
  } else if (empreendimento.precoMinimo) {
    msg += `💰 A partir de ${formatCurrency(empreendimento.precoMinimo)}\n\n`;
  }

  // Disponibilidade
  msg += `🏠 *Disponibilidade*\n`;
  msg += `${disponiveis} de ${total} unidades disponíveis\n\n`;

  // Diferenciais (top 5)
  if (empreendimento.diferenciais && empreendimento.diferenciais.length > 0) {
    msg += `✨ *Destaques*\n`;
    empreendimento.diferenciais.slice(0, 5).forEach(dif => {
      msg += `• ${dif}\n`;
    });
    msg += `\n`;
  }

  msg += `📲 Entre em contato para mais informações!`;

  return msg;
}

/**
 * Formata mensagem com condições de pagamento
 */
export function formatCondicoesPagamento(
  empreendimento: EmpreendimentoData,
  series: any[]
): string {
  let msg = `💰 *Condições de Pagamento*\n`;
  msg += `${empreendimento.nome}\n\n`;

  if (series && series.length > 0) {
    series.forEach((serie, index) => {
      msg += `*Opção ${index + 1}*\n`;

      if (serie.percentualEntrada || serie.entrada) {
        const entrada = serie.percentualEntrada || serie.entrada;
        msg += `• Entrada: ${entrada}%\n`;
      }

      if (serie.parcelas || serie.numeroParcelas) {
        const parcelas = serie.parcelas || serie.numeroParcelas;
        msg += `• ${parcelas}x durante obra\n`;
      }

      if (serie.percentualFinanciamento || serie.financiamento) {
        const fin = serie.percentualFinanciamento || serie.financiamento;
        msg += `• Financiamento: ${fin}%\n`;
      }

      msg += `\n`;
    });
  }

  msg += `📲 Consulte valores e simule seu financiamento!`;

  return msg;
}

/**
 * Formata mensagem com dados de simulação financeira
 */
export function formatSimulacao(
  empreendimento: EmpreendimentoData,
  simulacao: SimulacaoData,
  unidade?: { numero: string; tipo: string }
): string {
  let msg = `🧮 *Simulação Financeira*\n`;
  msg += `${empreendimento.nome}\n`;

  if (unidade) {
    msg += `Unidade ${unidade.numero} - ${unidade.tipo}\n`;
  }

  msg += `\n`;

  msg += `💵 *Valor do Imóvel*\n`;
  msg += `${formatCurrency(simulacao.valorImovel)}\n\n`;

  msg += `💰 *Entrada*\n`;
  msg += `${formatCurrency(simulacao.entrada)} (${simulacao.percentualEntrada.toFixed(0)}%)\n\n`;

  msg += `🏦 *Financiamento*\n`;
  msg += `${formatCurrency(simulacao.valorFinanciado)}\n`;
  msg += `${simulacao.prazoMeses} meses • ${simulacao.taxaAnual.toFixed(2)}% a.a.\n\n`;

  msg += `📊 *Parcela Mensal*\n`;
  msg += `${formatCurrency(simulacao.parcelaMensal)}\n\n`;

  msg += `📈 *Resumo*\n`;
  msg += `Total pago: ${formatCurrency(simulacao.totalPago)}\n`;
  msg += `Total de juros: ${formatCurrency(simulacao.totalJuros)}\n\n`;

  msg += `⚠️ *Simulação sujeita a aprovação de crédito*\n`;
  msg += `📲 Entre em contato para mais detalhes!`;

  return msg;
}

/**
 * Formata mensagem com informações de uma unidade específica
 */
export function formatUnidade(
  empreendimento: EmpreendimentoData,
  unidade: UnidadeData
): string {
  let msg = `🏢 *${empreendimento.nome}*\n\n`;

  msg += `🏠 *Unidade ${unidade.final || unidade.id}*\n`;
  msg += `Tipo: ${unidade.tipo}\n`;

  if (unidade.andar) {
    msg += `Andar: ${unidade.andar}\n`;
  }

  msg += `\n`;

  msg += `📐 *Características*\n`;
  msg += `• ${unidade.metragem}m²\n`;
  msg += `• ${unidade.quartos} dormitório${unidade.quartos > 1 ? 's' : ''}\n`;
  msg += `• ${unidade.vagas} vaga${unidade.vagas > 1 ? 's' : ''}\n\n`;

  msg += `💰 *Valor*\n`;
  msg += `${formatCurrency(unidade.valor)}\n\n`;

  msg += `✅ Status: *${unidade.status === 'disponivel' ? 'Disponível' : 'Reservada'}*\n\n`;

  msg += `📲 Entre em contato para agendar visita!`;

  return msg;
}

/**
 * Formata mensagem para book completo (texto + imagens)
 */
export function formatBookCompleto(
  empreendimento: EmpreendimentoData,
  unidades: UnidadeData[]
): string {
  const disponiveis = unidades.filter(u => u.status === 'disponivel').length;

  let msg = `📖 *BOOK COMPLETO*\n\n`;
  msg += `🏢 *${empreendimento.nome}*\n\n`;

  // Localização
  if (empreendimento.bairro || empreendimento.cidade) {
    msg += `📍 *Localização*\n`;
    msg += `${[empreendimento.bairro, empreendimento.cidade].filter(Boolean).join(', ')}\n\n`;
  }

  // Construtora
  if (empreendimento.construtora) {
    msg += `🏗️ *Construtora*\n`;
    msg += `${empreendimento.construtora}\n\n`;
  }

  // Descrição
  if (empreendimento.descricao) {
    msg += `📝 *Sobre o Empreendimento*\n`;
    msg += `${empreendimento.descricao}\n\n`;
  }

  // Diferenciais
  if (empreendimento.diferenciais && empreendimento.diferenciais.length > 0) {
    msg += `✨ *Diferenciais*\n`;
    empreendimento.diferenciais.forEach(dif => {
      msg += `• ${dif}\n`;
    });
    msg += `\n`;
  }

  // Valores
  if (empreendimento.precoMinimo && empreendimento.precoMaximo) {
    msg += `💰 *Valores*\n`;
    msg += `De ${formatCurrency(empreendimento.precoMinimo)} a ${formatCurrency(empreendimento.precoMaximo)}\n\n`;
  } else if (empreendimento.precoMinimo) {
    msg += `💰 A partir de ${formatCurrency(empreendimento.precoMinimo)}\n\n`;
  }

  // Disponibilidade
  msg += `🏠 *Disponibilidade*\n`;
  msg += `${disponiveis} unidades disponíveis\n\n`;

  // Entrega
  if (empreendimento.previsaoEntrega) {
    msg += `📅 *Previsão de Entrega*\n`;
    msg += `${empreendimento.previsaoEntrega}\n\n`;
  }

  msg += `📲 Entre em contato para receber plantas, fotos e mais informações!`;

  return msg;
}

/**
 * Formata mensagem de comparação entre empreendimentos
 */
export function formatComparacao(empreendimentos: EmpreendimentoData[]): string {
  let msg = `⚖️ *COMPARAÇÃO DE EMPREENDIMENTOS*\n\n`;

  empreendimentos.forEach((emp, index) => {
    msg += `*${index + 1}. ${emp.nome}*\n`;

    if (emp.bairro) {
      msg += `📍 ${emp.bairro}\n`;
    }

    if (emp.precoMinimo) {
      msg += `💰 A partir de ${formatCurrency(emp.precoMinimo)}\n`;
    }

    if (emp.previsaoEntrega) {
      msg += `📅 ${emp.previsaoEntrega}\n`;
    }

    msg += `\n`;
  });

  msg += `📲 Qual te interessou mais? Vamos conversar!`;

  return msg;
}

/**
 * Substitui variáveis em um template de mensagem
 */
export function replaceTemplateVariables(
  template: string,
  empreendimento: EmpreendimentoData,
  unidades?: UnidadeData[]
): string {
  const disponiveis = unidades?.filter(u => u.status === 'disponivel').length || 0;

  return template
    .replace(/{nome_empreendimento}/g, empreendimento.nome)
    .replace(/{cidade}/g, empreendimento.cidade || '')
    .replace(/{bairro}/g, empreendimento.bairro || '')
    .replace(/{construtora}/g, empreendimento.construtora || '')
    .replace(/{preco}/g, empreendimento.precoMinimo ? formatCurrency(empreendimento.precoMinimo) : 'Consulte')
    .replace(/{preco_minimo}/g, empreendimento.precoMinimo ? formatCurrency(empreendimento.precoMinimo) : '')
    .replace(/{preco_maximo}/g, empreendimento.precoMaximo ? formatCurrency(empreendimento.precoMaximo) : '')
    .replace(/{disponibilidade}/g, `${disponiveis} unidades`)
    .replace(/{entrega}/g, empreendimento.previsaoEntrega || '');
}
