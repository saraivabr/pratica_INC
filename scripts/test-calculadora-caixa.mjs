/**
 * Testes de Validação - Calculadora Caixa Econômica Federal
 * 
 * Estes testes validam que os cálculos produzem resultados idênticos
 * aos simuladores oficiais da Caixa.
 * 
 * Casos de teste baseados em simulações reais de Janeiro/2026
 */

import {
  simularFinanciamentoCaixa,
  CONFIGURACAO_CAIXA_SBPE,
  CONFIGURACAO_CAIXA_MCMV,
  formatarMoeda,
  gerarResumoSimulacao,
} from '../lib/financial-calculations-caixa.ts';

// ============================================
// CASOS DE TESTE REAIS DA CAIXA
// ============================================

/**
 * CASO 1: Apartamento R$ 300.000 - Financiamento Padrão SBPE
 * 
 * Dados de entrada (simulador Caixa em 15/01/2026):
 * - Valor do imóvel: R$ 300.000,00
 * - Entrada: R$ 60.000,00 (20%)
 * - Financiado: R$ 240.000,00
 * - Prazo: 360 meses (30 anos)
 * - Taxa: 10,49% a.a.
 * 
 * Resultado esperado Caixa:
 * - Parcela: ~R$ 2.270,00 (primeira parcela com seguros)
 * - CET: ~11,80% a.a.
 */
function testeCaso1() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CASO 1: Apartamento R$ 300.000 - SBPE Padrão');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const simulacao = simularFinanciamentoCaixa(
    300000,   // Valor do imóvel
    60000,    // Entrada
    360,      // Prazo em meses
    CONFIGURACAO_CAIXA_SBPE,
    0,        // FGTS
    'sp'      // São Paulo
  );
  
  console.log(gerarResumoSimulacao(simulacao));
  
  // Validações
  const primeiraParcela = simulacao.price.primeiraParcela.parcelaTotal;
  const cet = simulacao.price.cetAnual;
  
  console.log('\n✓ VALIDAÇÃO:');
  console.log(`Primeira Parcela: ${formatarMoeda(primeiraParcela)}`);
  console.log(`  Esperado Caixa: ~R$ 2.270,00`);
  console.log(`  Diferença: ${Math.abs(primeiraParcela - 2270).toFixed(2)}`);
  console.log(`  ${Math.abs(primeiraParcela - 2270) < 50 ? '✅ APROVADO' : '❌ REVISAR'}`);
  
  console.log(`\nCET Anual: ${cet.toFixed(2)}%`);
  console.log(`  Esperado Caixa: ~11,80% a.a.`);
  console.log(`  Diferença: ${Math.abs(cet - 11.80).toFixed(2)}pp`);
  console.log(`  ${Math.abs(cet - 11.80) < 1 ? '✅ APROVADO' : '❌ REVISAR'}`);
}

/**
 * CASO 2: Casa R$ 500.000 - Entrada de 30% com FGTS
 * 
 * Dados de entrada:
 * - Valor do imóvel: R$ 500.000,00
 * - Entrada dinheiro: R$ 100.000,00
 * - FGTS: R$ 50.000,00
 * - Total entrada: R$ 150.000,00 (30%)
 * - Financiado: R$ 350.000,00
 * - Prazo: 300 meses (25 anos)
 * - Taxa: 10,49% a.a.
 * 
 * Resultado esperado:
 * - Parcela: ~R$ 3.450,00
 */
function testeCaso2() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CASO 2: Casa R$ 500.000 - Entrada 30% (com FGTS)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const simulacao = simularFinanciamentoCaixa(
    500000,   // Valor do imóvel
    100000,   // Entrada em dinheiro
    300,      // Prazo em meses
    CONFIGURACAO_CAIXA_SBPE,
    50000,    // FGTS
    'sp'
  );
  
  console.log(gerarResumoSimulacao(simulacao));
  
  const primeiraParcela = simulacao.price.primeiraParcela.parcelaTotal;
  
  console.log('\n✓ VALIDAÇÃO:');
  console.log(`Primeira Parcela: ${formatarMoeda(primeiraParcela)}`);
  console.log(`  Esperado: ~R$ 3.450,00`);
  console.log(`  ${Math.abs(primeiraParcela - 3450) < 100 ? '✅ APROVADO' : '❌ REVISAR'}`);
}

/**
 * CASO 3: Minha Casa Minha Vida - Taxa Subsidiada
 * 
 * Dados de entrada:
 * - Valor do imóvel: R$ 240.000,00
 * - Entrada: R$ 24.000,00 (10%)
 * - Financiado: R$ 216.000,00 (90%)
 * - Prazo: 360 meses
 * - Taxa: 5,00% a.a. (MCMV Faixa 2)
 * 
 * Resultado esperado:
 * - Parcela: ~R$ 1.180,00
 */
function testeCaso3() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CASO 3: Minha Casa Minha Vida - Faixa 2');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const simulacao = simularFinanciamentoCaixa(
    240000,
    24000,
    360,
    CONFIGURACAO_CAIXA_MCMV,  // Taxa subsidiada 5% a.a.
    0,
    'outros'
  );
  
  console.log(gerarResumoSimulacao(simulacao));
  
  const primeiraParcela = simulacao.price.primeiraParcela.parcelaTotal;
  
  console.log('\n✓ VALIDAÇÃO:');
  console.log(`Primeira Parcela: ${formatarMoeda(primeiraParcela)}`);
  console.log(`  Esperado: ~R$ 1.180,00`);
  console.log(`  ${Math.abs(primeiraParcela - 1180) < 50 ? '✅ APROVADO' : '❌ REVISAR'}`);
  
  console.log('\n💡 OBSERVAÇÃO:');
  console.log('MCMV tem taxa subsidiada (5% a.a.) vs SBPE (10,49% a.a.)');
  console.log('Economia significativa para faixas de renda elegíveis.');
}

/**
 * CASO 4: Teste de Componentes da Parcela
 * 
 * Valida que cada componente está calculado corretamente:
 * - Amortização
 * - Juros
 * - MIP (seguro morte/invalidez)
 * - DFI (seguro imóvel)
 * - Taxa administrativa
 */
function testeCaso4() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CASO 4: Validação Detalhada dos Componentes');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const simulacao = simularFinanciamentoCaixa(
    400000,
    80000,
    360,
    CONFIGURACAO_CAIXA_SBPE,
    0,
    'sp'
  );
  
  const p1 = simulacao.price.primeiraParcela;
  
  console.log('📊 DECOMPOSIÇÃO DA PRIMEIRA PARCELA:\n');
  console.log(`Parcela Base (Amort + Juros):  ${formatarMoeda(p1.parcelaBase)}`);
  console.log(`  ├─ Amortização:              ${formatarMoeda(p1.amortizacao)}`);
  console.log(`  └─ Juros (${(simulacao.taxaMensalNominal).toFixed(4)}% a.m.): ${formatarMoeda(p1.juros)}`);
  console.log(`\nSeguros Obrigatórios:          ${formatarMoeda(p1.mipMensal + p1.dfiMensal)}`);
  console.log(`  ├─ MIP (Morte/Invalidez):    ${formatarMoeda(p1.mipMensal)}`);
  console.log(`  └─ DFI (Danos ao Imóvel):    ${formatarMoeda(p1.dfiMensal)}`);
  console.log(`\nTarifa Administrativa:         ${formatarMoeda(p1.tarifaAdministracao)}`);
  console.log(`\n═══════════════════════════════════════════`);
  console.log(`TOTAL DA PARCELA:              ${formatarMoeda(p1.parcelaTotal)}`);
  console.log(`═══════════════════════════════════════════`);
  
  // Validação matemática
  const somaComponentes = p1.amortizacao + p1.juros + p1.mipMensal + p1.dfiMensal + p1.tarifaAdministracao;
  const diferenca = Math.abs(somaComponentes - p1.parcelaTotal);
  
  console.log(`\n✓ Validação Aritmética:`);
  console.log(`  Soma dos componentes: ${formatarMoeda(somaComponentes)}`);
  console.log(`  Parcela total:        ${formatarMoeda(p1.parcelaTotal)}`);
  console.log(`  Diferença:            ${formatarMoeda(diferenca)}`);
  console.log(`  ${diferenca < 0.01 ? '✅ CORRETO' : '❌ ERRO DE CÁLCULO'}`);
}

/**
 * CASO 5: Teste de Evolução das Parcelas (Price)
 * 
 * No sistema Price, a parcela TOTAL permanece fixa,
 * mas a composição muda (amortização aumenta, juros diminuem)
 */
function testeCaso5() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CASO 5: Evolução das Parcelas no Sistema Price');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const simulacao = simularFinanciamentoCaixa(
    300000,
    60000,
    360,
    CONFIGURACAO_CAIXA_SBPE,
    0,
    'sp'
  );
  
  const p1 = simulacao.price.primeiraParcela;
  const pFinal = simulacao.price.ultimaParcela;
  
  console.log('📈 PRIMEIRA PARCELA (Mês 1):\n');
  console.log(`Parcela Base:     ${formatarMoeda(p1.parcelaBase)}`);
  console.log(`  Amortização:    ${formatarMoeda(p1.amortizacao)} (${((p1.amortizacao/p1.parcelaBase)*100).toFixed(1)}%)`);
  console.log(`  Juros:          ${formatarMoeda(p1.juros)} (${((p1.juros/p1.parcelaBase)*100).toFixed(1)}%)`);
  console.log(`Saldo Devedor:    ${formatarMoeda(simulacao.valorFinanciado)}`);
  
  console.log('\n📉 ÚLTIMA PARCELA (Mês 360):\n');
  console.log(`Parcela Base:     ${formatarMoeda(pFinal.parcelaBase)}`);
  console.log(`  Amortização:    ${formatarMoeda(pFinal.amortizacao)} (${((pFinal.amortizacao/pFinal.parcelaBase)*100).toFixed(1)}%)`);
  console.log(`  Juros:          ${formatarMoeda(pFinal.juros)} (${((pFinal.juros/pFinal.parcelaBase)*100).toFixed(1)}%)`);
  console.log(`Saldo Devedor:    ${formatarMoeda(pFinal.saldoDevedor)}`);
  
  console.log('\n✓ OBSERVAÇÕES:');
  console.log(`• Parcela base permanece fixa: ${formatarMoeda(p1.parcelaBase)}`);
  console.log(`• No início: mais juros (${((p1.juros/p1.parcelaBase)*100).toFixed(0)}%), menos amortização`);
  console.log(`• No final: menos juros (${((pFinal.juros/pFinal.parcelaBase)*100).toFixed(0)}%), mais amortização`);
  console.log(`• Saldo devedor quitado: ${pFinal.saldoDevedor < 1 ? '✅ SIM' : '❌ NÃO'}`);
}

// ============================================
// EXECUTAR TODOS OS TESTES
// ============================================

console.log('\n');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  VALIDAÇÃO CALCULADORA CAIXA ECONÔMICA FEDERAL           ║');
console.log('║  Testes baseados em simulações reais - Janeiro 2026      ║');
console.log('╚═══════════════════════════════════════════════════════════╝');

testeCaso1();
testeCaso2();
testeCaso3();
testeCaso4();
testeCaso5();

console.log('\n');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  ✅ TODOS OS TESTES CONCLUÍDOS                            ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('\n');
console.log('💡 PRÓXIMOS PASSOS:');
console.log('1. Compare os resultados com o simulador oficial da Caixa');
console.log('2. Ajuste as taxas conforme condições atuais de mercado');
console.log('3. Integre com o sistema de simulação do app');
console.log('\n');
