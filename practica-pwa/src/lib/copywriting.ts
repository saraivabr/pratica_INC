export const copy = {
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
};

export function getRandomCopy(key: keyof typeof copy): string {
  const array = copy[key];
  return array[Math.floor(Math.random() * array.length)];
}
