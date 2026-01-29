// CataVendas Intent Detection

import { CataVendasIntent } from './types';

export function detectIntent(message: string): CataVendasIntent {
  const lowercaseMessage = message.toLowerCase().trim();

  // Keywords for catavendas_scan (THE KILLER FEATURE)
  const scanKeywords = [
    'cata', 'catavendas', 'busca', 'perdido', 'esfriou', 'frio', 'fria', 
    'parou de responder', 'sumiu', 'esqueceu', 'abandonou', 'cold',
    'recupera', 'resgata', 'volta', 'reaproxima'
  ];

  // Keywords for list_properties
  const propertiesKeywords = [
    'imóve', 'empreendimento', 'disponível', 'apartamento', 'casa',
    'propriedade', 'obra', 'lançamento', 'unidade'
  ];

  // Keywords for my_leads
  const leadsKeywords = [
    'meus leads', 'meus clientes', 'minha carteira', 'leads',
    'clientes', 'contatos', 'prospects'
  ];

  // Keywords for generate_followup
  const followupKeywords = [
    'manda mensagem', 'envia mensagem', 'fala com', 'recupera',
    'follow up', 'followup', 'retoma contato', 'volta a falar'
  ];

  // Keywords for pipeline_status
  const pipelineKeywords = [
    'funil', 'pipeline', 'vendas', 'status', 'situação', 
    'quantas vendas', 'como tá', 'desempenho'
  ];

  // Keywords for lead_detail (needs name context)
  const detailKeywords = [
    'sobre', 'info', 'informação', 'detalhe', 'histórico', 'conversa'
  ];

  // Check for specific intents
  if (scanKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
    return 'catavendas_scan';
  }

  if (propertiesKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
    return 'list_properties';
  }

  if (leadsKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
    return 'my_leads';
  }

  if (followupKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
    return 'generate_followup';
  }

  if (pipelineKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
    return 'pipeline_status';
  }

  if (detailKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
    return 'lead_detail';
  }

  // Default to general help
  return 'general_help';
}

export function extractLeadNameFromMessage(message: string): string | null {
  const lowercaseMessage = message.toLowerCase();

  // Common patterns for lead names in messages
  const patterns = [
    /(?:sobre|info|detalhe|fala (?:com|do|da)|mensagem (?:pro|pra|para))\s+([a-záçõãéêôóàúíü\s]{2,}?)(?:\s|$)/i,
    /(?:lead|cliente)\s+([a-záçõãéêôóàúíü\s]{2,}?)(?:\s|$)/i,
    /([a-záçõãéêôóàúíü\s]{2,}?)(?:\s+parou|\s+sumiu|\s+esfriou)/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      // Filter out common false positives
      const stopWords = ['mensagem', 'contato', 'responder', 'lead', 'cliente', 'para', 'pro', 'pra', 'com', 'do', 'da'];
      if (!stopWords.includes(name.toLowerCase()) && name.length > 1) {
        return name;
      }
    }
  }

  return null;
}

export function isFollowUpConfirmation(message: string): boolean {
  const confirmationWords = [
    'sim', 'yes', 'manda', 'envia', 'ok', 'confirma', 'vai',
    'perfeito', 'isso', 'exato', 'pode mandar', 'pode enviar'
  ];

  const rejectionWords = [
    'não', 'no', 'nao', 'nunca', 'cancela', 'para', 'stop'
  ];

  const lowercaseMessage = message.toLowerCase().trim();

  if (rejectionWords.some(word => lowercaseMessage === word || lowercaseMessage.includes(` ${word} `))) {
    return false;
  }

  return confirmationWords.some(word => lowercaseMessage.includes(word));
}

export function isGreeting(message: string): boolean {
  const greetings = [
    'oi', 'olá', 'ola', 'hey', 'ei', 'bom dia', 'boa tarde', 
    'boa noite', 'salve', 'eae', 'e ai', 'fala'
  ];

  const lowercaseMessage = message.toLowerCase().trim();
  return greetings.some(greeting => 
    lowercaseMessage === greeting || 
    lowercaseMessage.startsWith(greeting + ' ') ||
    lowercaseMessage.startsWith(greeting + ',') ||
    lowercaseMessage.startsWith(greeting + '!')
  );
}