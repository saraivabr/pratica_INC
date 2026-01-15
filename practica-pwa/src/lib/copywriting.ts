export const copy = {
  catalogo: [
    '🔍 Descubra seu próximo grande negócio',
    '✨ Portfólio de ouro esperando por você',
    '🚀 As melhores oportunidades estão aqui',
    '💎 Explore a seleção premium',
    '🎯 Encontre o imóvel perfeito',
  ],
  favoritos: [
    '❤️ Seus imóveis salvos',
    '⭐ Sua coleção especial',
    '🎁 Jóias guardadas pra depois',
    '🌟 As melhores opções para você',
  ],
  preReservas: [
    '📋 Suas reservas em dia',
    '✅ Acompanhe seus negócios',
    '🎯 Suas propostas ativas',
    '📊 Dashboard de vendas',
  ],
  motivational: [
    '🔥 Vamos vender hoje?',
    '💪 Você consegue!',
    '🎯 Pronto pra impressionar?',
    '✨ Encontre a melhor opção',
    '🚀 Decolando vendas!',
  ],
  espelho: [
    'Vê só... {n} unidades saíram essa semana!',
    'O mercado está quente 🔥',
    'Essas unidades não vão durar',
    'Tem cliente pedindo por aqui!',
  ],
  simulator: [
    'Deixa eu calcular isso pra ti',
    'Encontrei a melhor opção',
    'Olha que legal essa proposta',
  ],
  propostas: [
    'Suas histórias de venda',
    'Histórico de propostas',
    'Suas conquistas',
  ],
  success: [
    '🎉 Proposta enviada!',
    '✨ Sucesso!',
    '🎊 Partiu fechar essa venda!',
  ],
  emptyState: [
    'Nada por aqui ainda... 🤷',
    'Em breve algo incrível! ✨',
    'Espaço em branco, oportunidade em cheio! 🚀',
  ],
};

export function getRandomCopy(key: keyof typeof copy): string {
  const array = copy[key];
  return array[Math.floor(Math.random() * array.length)];
}
