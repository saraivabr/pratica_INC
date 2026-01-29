import {
  simularFinanciamentoCaixa,
  CONFIGURACAO_CAIXA_SBPE,
  CONFIGURACAO_CAIXA_MCMV,
  formatarMoeda,
  gerarResumoSimulacao,
} from '../lib/financial-calculations-caixa';

async function main() {
  console.log('🧪 Testando Calculadora Financeira Caixa...\n');

  const simulacao = simularFinanciamentoCaixa(
    300000,   // Valor do imóvel
    60000,    // Entrada
    360,      // Prazo em meses
    CONFIGURACAO_CAIXA_SBPE,
    0,        // FGTS
    'sp'      // São Paulo
  );

  console.log(gerarResumoSimulacao(simulacao));
  
  const p1 = simulacao.price.primeiraParcela.parcelaTotal;
  console.log(`\n✅ Primeira Parcela: ${formatarMoeda(p1)}`);
  
  if (p1 > 2000 && p1 < 2500) {
    console.log('✅ Cálculo dentro da faixa esperada para SBPE.');
  } else {
    console.log('❌ Cálculo fora da faixa esperada.');
  }
}

main().catch(console.error);

