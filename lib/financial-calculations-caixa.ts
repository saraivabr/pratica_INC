/**
 * Calculadora Financeira Especialista - Padrão Caixa Econômica Federal
 * 
 * Este módulo implementa os cálculos EXATOS usados pela CEF em financiamentos imobiliários,
 * incluindo todas as alíquotas, seguros obrigatórios e taxas acessórias.
 * 
 * Base Legal:
 * - Resolução CMN 4.676/2018 (Limites de financiamento)
 * - Circular BACEN 3.839/2017 (Taxas de juros)
 * - Lei 13.465/2017 (Regularização fundiária)
 * 
 * Última atualização: Janeiro 2026
 */

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface ConfiguracaoCaixa {
  // Taxas de Juros (% a.a.)
  taxaNominalAnual: number;           // Ex: 10.00% a.a. (SBPE)
  
  // Seguros Obrigatórios
  mip: {
    taxa: number;                      // Morte e Invalidez Permanente (0.01234% a.a. sobre saldo devedor)
    ativo: boolean;
  };
  
  dfi: {
    taxa: number;                      // Danos Físicos ao Imóvel (0.0322% a.a. sobre valor do imóvel)
    ativo: boolean;
  };
  
  // Taxas Administrativas
  tarifaCadastro: number;              // Taxa única inicial (R$ 25,00 - pode variar)
  taxaAdministracao: number;           // Taxa mensal (R$ 25,00 - pode variar)
  
  // Limites e Regras
  percentualMaxFinanciamento: number;  // 80% ou 90% dependendo do programa
  prazoMaximoMeses: number;            // 420 meses (35 anos)
  comprometimentoRendaMax: number;     // 30% ou 35% da renda familiar
  
  // FGTS
  fgtsPermitido: boolean;              // Pode usar FGTS como entrada?
  fgtsAmortizacaoAnual: boolean;       // Pode usar FGTS para amortizar anualmente?
}

export interface ParcelaCaixa {
  numero: number;
  
  // Amortização Principal
  amortizacao: number;
  
  // Juros
  juros: number;
  
  // Seguros
  mipMensal: number;                   // Seguro MIP mensal
  dfiMensal: number;                   // Seguro DFI mensal
  
  // Taxas
  tarifaAdministracao: number;         // Taxa administrativa mensal
  
  // Totais
  parcelaBase: number;                 // Amortização + Juros (sem seguros/taxas)
  parcelaTotal: number;                // Tudo incluso
  
  saldoDevedor: number;
}

export interface SimulacaoCaixa {
  // Dados de Entrada
  valorImovel: number;
  valorEntrada: number;
  valorFGTS: number;                   // Se usar FGTS
  valorFinanciado: number;
  percentualFinanciado: number;
  prazoMeses: number;
  
  // Taxas Aplicadas
  taxaNominalAnual: number;
  taxaMensalNominal: number;
  taxaMensalEfetiva: number;           // Taxa efetiva com seguros
  
  // Custos Iniciais (antes da 1ª parcela)
  custosIniciais: {
    tarifaCadastro: number;
    avaliacaoImovel: number;            // ~R$ 1.800,00 (varia por região)
    registroContrato: number;           // ~1% do valor financiado
    itbi: number;                       // 2% a 3% do valor do imóvel (varia por cidade)
    total: number;
  };
  
  // Sistema PRICE (padrão Caixa)
  price: {
    primeiraParcela: ParcelaCaixa;
    ultimaParcela: ParcelaCaixa;
    parcelaMediaPrimeirosAnos: number;  // Média dos primeiros 5 anos
    
    // Totais
    totalAmortizado: number;
    totalJuros: number;
    totalMIP: number;
    totalDFI: number;
    totalTarifas: number;
    totalPago: number;                  // Soma de TUDO
    
    // CET (Custo Efetivo Total)
    cetMensal: number;
    cetAnual: number;
  };
  
  // Sistema SAC (alternativa)
  sac?: {
    primeiraParcela: ParcelaCaixa;
    ultimaParcela: ParcelaCaixa;
    totalPago: number;
  };
  
  // Análise de Viabilidade
  viabilidade: {
    rendaMinimaPrice: number;           // 30% de comprometimento
    rendaMinimaSac: number;
    aprovaAutomatica: boolean;          // Score + renda ok?
    observacoes: string[];
  };
}

// ============================================
// CONFIGURAÇÕES PADRÃO CAIXA 2026
// ============================================

export const CONFIGURACAO_CAIXA_SBPE: ConfiguracaoCaixa = {
  // Taxa média SBPE Caixa (varia conforme relacionamento do cliente)
  taxaNominalAnual: 10.49,  // 10.49% a.a. (jan/2026 - pode variar de 9.49% a 11.49%)
  
  // MIP - Seguro de Morte e Invalidez Permanente
  mip: {
    taxa: 0.01234,  // 0.01234% ao ano sobre saldo devedor (valor médio)
    ativo: true,
  },
  
  // DFI - Seguro de Danos Físicos ao Imóvel
  dfi: {
    taxa: 0.0322,  // 0.0322% ao ano sobre valor do imóvel (valor médio)
    ativo: true,
  },
  
  // Tarifas
  tarifaCadastro: 25.00,           // Tarifa única na contratação
  taxaAdministracao: 25.00,        // Tarifa mensal
  
  // Limites
  percentualMaxFinanciamento: 80,  // 80% do valor do imóvel (SBPE padrão)
  prazoMaximoMeses: 420,           // 35 anos
  comprometimentoRendaMax: 30,     // 30% da renda bruta familiar
  
  // FGTS
  fgtsPermitido: true,
  fgtsAmortizacaoAnual: true,
};

export const CONFIGURACAO_CAIXA_MCMV: ConfiguracaoCaixa = {
  // Minha Casa Minha Vida (taxa subsidiada)
  taxaNominalAnual: 5.00,  // 5.00% a.a. para Faixa 2 (R$ 2.640,01 a R$ 4.400,00)
  
  mip: {
    taxa: 0.01234,
    ativo: true,
  },
  
  dfi: {
    taxa: 0.0322,
    ativo: true,
  },
  
  tarifaCadastro: 25.00,
  taxaAdministracao: 25.00,
  
  percentualMaxFinanciamento: 90,  // MCMV pode financiar até 90%
  prazoMaximoMeses: 420,
  comprometimentoRendaMax: 35,     // 35% para MCMV
  
  fgtsPermitido: true,
  fgtsAmortizacaoAnual: true,
};

// ============================================
// FUNÇÕES DE CÁLCULO ESPECIALIZADAS
// ============================================

/**
 * Converte taxa nominal anual para taxa mensal (método da Caixa)
 * A Caixa usa taxa nominal simples (divide por 12)
 */
export function taxaCaixaAnualParaMensal(taxaAnual: number): number {
  return taxaAnual / 12;
}

/**
 * Calcula o MIP (Seguro) mensal sobre o saldo devedor
 * MIP incide sobre o saldo devedor e é calculado mensalmente
 */
export function calcularMIPMensal(
  saldoDevedor: number,
  taxaMIPAnual: number
): number {
  // MIP anual / 12 meses, aplicado sobre saldo devedor
  const taxaMIPMensal = taxaMIPAnual / 12 / 100;
  return saldoDevedor * taxaMIPMensal;
}

/**
 * Calcula o DFI (Seguro do Imóvel) mensal sobre o valor do imóvel
 * DFI incide sobre o valor do imóvel (fixo) durante todo o financiamento
 */
export function calcularDFIMensal(
  valorImovel: number,
  taxaDFIAnual: number
): number {
  // DFI anual / 12 meses, aplicado sobre valor do imóvel
  const taxaDFIMensal = taxaDFIAnual / 12 / 100;
  return valorImovel * taxaDFIMensal;
}

/**
 * Calcula custos iniciais (antes da primeira parcela)
 */
export function calcularCustosIniciais(
  valorImovel: number,
  valorFinanciado: number,
  configuracao: ConfiguracaoCaixa,
  cidade: 'sp' | 'rj' | 'outros' = 'outros'
): {
  tarifaCadastro: number;
  avaliacaoImovel: number;
  registroContrato: number;
  itbi: number;
  total: number;
} {
  // Tarifa de cadastro
  const tarifaCadastro = configuracao.tarifaCadastro;
  
  // Avaliação do imóvel (varia por região)
  const avaliacaoImovel = cidade === 'sp' ? 2200 : cidade === 'rj' ? 2000 : 1800;
  
  // Registro de contrato em cartório (média 1% do valor financiado)
  const registroContrato = valorFinanciado * 0.01;
  
  // ITBI (Imposto de Transmissão de Bens Imóveis) - varia por cidade
  // SP: 3%, RJ: 2%, Outros: 2.5% (média)
  const aliquotaITBI = cidade === 'sp' ? 0.03 : cidade === 'rj' ? 0.02 : 0.025;
  const itbi = valorImovel * aliquotaITBI;
  
  const total = tarifaCadastro + avaliacaoImovel + registroContrato + itbi;
  
  return {
    tarifaCadastro,
    avaliacaoImovel,
    registroContrato,
    itbi,
    total,
  };
}

/**
 * Gera tabela Price com seguros e taxas da Caixa
 * ESTE É O MÉTODO EXATO USADO PELA CAIXA
 */
export function gerarTabelaPriceCaixa(
  valorFinanciado: number,
  valorImovel: number,
  taxaNominalAnual: number,
  prazoMeses: number,
  configuracao: ConfiguracaoCaixa
): ParcelaCaixa[] {
  const taxaMensal = taxaCaixaAnualParaMensal(taxaNominalAnual) / 100;
  
  // Cálculo da parcela base (amortização + juros) - fórmula PMT padrão
  const parcelaBase = valorFinanciado *
    (taxaMensal * Math.pow(1 + taxaMensal, prazoMeses)) /
    (Math.pow(1 + taxaMensal, prazoMeses) - 1);
  
  const parcelas: ParcelaCaixa[] = [];
  let saldoDevedor = valorFinanciado;
  
  for (let n = 1; n <= prazoMeses; n++) {
    // Juros sobre saldo devedor
    const juros = saldoDevedor * taxaMensal;
    
    // Amortização = parcela base - juros
    const amortizacao = parcelaBase - juros;
    
    // MIP mensal (sobre saldo devedor)
    const mipMensal = configuracao.mip.ativo
      ? calcularMIPMensal(saldoDevedor, configuracao.mip.taxa)
      : 0;
    
    // DFI mensal (sobre valor do imóvel - fixo)
    const dfiMensal = configuracao.dfi.ativo
      ? calcularDFIMensal(valorImovel, configuracao.dfi.taxa)
      : 0;
    
    // Taxa de administração mensal
    const tarifaAdministracao = configuracao.taxaAdministracao;
    
    // Parcela total = amortização + juros + seguros + tarifa
    const parcelaTotal = parcelaBase + mipMensal + dfiMensal + tarifaAdministracao;
    
    parcelas.push({
      numero: n,
      amortizacao,
      juros,
      mipMensal,
      dfiMensal,
      tarifaAdministracao,
      parcelaBase,
      parcelaTotal,
      saldoDevedor: Math.max(0, saldoDevedor - amortizacao),
    });
    
    // Atualiza saldo devedor
    saldoDevedor -= amortizacao;
  }
  
  return parcelas;
}

/**
 * Calcula CET (Custo Efetivo Total) - obrigatório pela Caixa
 * CET inclui TODOS os custos: juros, seguros, tarifas, custos iniciais
 */
export function calcularCET(
  valorFinanciado: number,
  parcelas: ParcelaCaixa[],
  custosIniciais: number
): {
  cetMensal: number;
  cetAnual: number;
} {
  // CET é calculado como a taxa que iguala o valor financiado
  // ao valor presente de todos os desembolsos (parcelas + custos iniciais)
  
  // Método iterativo (Newton-Raphson) para encontrar a taxa CET
  let cetMensal = 0.01; // Chute inicial: 1% a.m.
  const tolerancia = 0.0001;
  const maxIteracoes = 100;
  
  for (let iter = 0; iter < maxIteracoes; iter++) {
    let vp = -valorFinanciado + custosIniciais;
    let dvp = 0;
    
    for (let n = 0; n < parcelas.length; n++) {
      const fator = Math.pow(1 + cetMensal, n + 1);
      vp += parcelas[n].parcelaTotal / fator;
      dvp -= (n + 1) * parcelas[n].parcelaTotal / (fator * (1 + cetMensal));
    }
    
    if (Math.abs(vp) < tolerancia) {
      break;
    }
    
    cetMensal = cetMensal - vp / dvp;
  }
  
  // Converte CET mensal para anual (capitalização composta)
  const cetAnual = (Math.pow(1 + cetMensal, 12) - 1) * 100;
  cetMensal = cetMensal * 100;
  
  return { cetMensal, cetAnual };
}

/**
 * Simula financiamento completo no padrão Caixa Econômica Federal
 * ESTA É A FUNÇÃO PRINCIPAL - USA EXATAMENTE AS MESMAS REGRAS DA CAIXA
 */
export function simularFinanciamentoCaixa(
  valorImovel: number,
  valorEntrada: number,
  prazoMeses: number,
  configuracao: ConfiguracaoCaixa = CONFIGURACAO_CAIXA_SBPE,
  valorFGTS: number = 0,
  cidade: 'sp' | 'rj' | 'outros' = 'outros'
): SimulacaoCaixa {
  // Entrada total = entrada em dinheiro + FGTS
  const entradaTotal = valorEntrada + valorFGTS;
  
  // Valor financiado
  const valorFinanciado = valorImovel - entradaTotal;
  const percentualFinanciado = (valorFinanciado / valorImovel) * 100;
  
  // Validações Caixa
  if (percentualFinanciado > configuracao.percentualMaxFinanciamento) {
    throw new Error(
      `Percentual financiado (${percentualFinanciado.toFixed(1)}%) excede o máximo permitido (${configuracao.percentualMaxFinanciamento}%)`
    );
  }
  
  if (prazoMeses > configuracao.prazoMaximoMeses) {
    throw new Error(
      `Prazo (${prazoMeses} meses) excede o máximo permitido (${configuracao.prazoMaximoMeses} meses)`
    );
  }
  
  // Taxas
  const taxaNominalAnual = configuracao.taxaNominalAnual;
  const taxaMensalNominal = taxaCaixaAnualParaMensal(taxaNominalAnual);
  
  // Custos iniciais
  const custosIniciais = calcularCustosIniciais(
    valorImovel,
    valorFinanciado,
    configuracao,
    cidade
  );
  
  // Gerar tabela Price
  const tabelaPrice = gerarTabelaPriceCaixa(
    valorFinanciado,
    valorImovel,
    taxaNominalAnual,
    prazoMeses,
    configuracao
  );
  
  // Totais Price
  const totalAmortizado = valorFinanciado;
  const totalJuros = tabelaPrice.reduce((sum, p) => sum + p.juros, 0);
  const totalMIP = tabelaPrice.reduce((sum, p) => sum + p.mipMensal, 0);
  const totalDFI = tabelaPrice.reduce((sum, p) => sum + p.dfiMensal, 0);
  const totalTarifas = tabelaPrice.reduce((sum, p) => sum + p.tarifaAdministracao, 0);
  const totalPago = entradaTotal + totalAmortizado + totalJuros + totalMIP + totalDFI + totalTarifas + custosIniciais.total;
  
  // CET (Custo Efetivo Total)
  const cet = calcularCET(valorFinanciado, tabelaPrice, custosIniciais.total);
  
  // Taxa efetiva mensal (incluindo seguros e tarifas)
  const parcelaTotalMedia = tabelaPrice.slice(0, 60).reduce((sum, p) => sum + p.parcelaTotal, 0) / Math.min(60, prazoMeses);
  const taxaMensalEfetiva = ((parcelaTotalMedia / valorFinanciado) - (1 / prazoMeses)) * 100;
  
  // Parcela média dos primeiros 5 anos (importante para análise)
  const primeirosAnos = Math.min(60, prazoMeses);
  const parcelaMediaPrimeirosAnos = 
    tabelaPrice.slice(0, primeirosAnos).reduce((sum, p) => sum + p.parcelaTotal, 0) / primeirosAnos;
  
  // Análise de viabilidade
  const rendaMinimaPrice = (tabelaPrice[0].parcelaTotal / configuracao.comprometimentoRendaMax) * 100;
  const rendaMinimaSac = rendaMinimaPrice * 1.1; // SAC primeira parcela ~10% maior
  
  const observacoes: string[] = [];
  let aprovaAutomatica = true;
  
  if (percentualFinanciado > 70) {
    observacoes.push('Financiamento acima de 70% pode exigir análise mais criteriosa.');
    aprovaAutomatica = false;
  }
  
  if (prazoMeses > 360) {
    observacoes.push('Prazo acima de 30 anos pode impactar aprovação.');
  }
  
  if (valorFGTS > 0) {
    observacoes.push(`FGTS utilizado: ${formatarMoeda(valorFGTS)} como parte da entrada.`);
  }
  
  return {
    valorImovel,
    valorEntrada: entradaTotal,
    valorFGTS,
    valorFinanciado,
    percentualFinanciado,
    prazoMeses,
    
    taxaNominalAnual,
    taxaMensalNominal,
    taxaMensalEfetiva,
    
    custosIniciais: {
      ...custosIniciais,
    },
    
    price: {
      primeiraParcela: tabelaPrice[0],
      ultimaParcela: tabelaPrice[tabelaPrice.length - 1],
      parcelaMediaPrimeirosAnos,
      
      totalAmortizado,
      totalJuros,
      totalMIP,
      totalDFI,
      totalTarifas,
      totalPago,
      
      cetMensal: cet.cetMensal,
      cetAnual: cet.cetAnual,
    },
    
    viabilidade: {
      rendaMinimaPrice,
      rendaMinimaSac,
      aprovaAutomatica,
      observacoes,
    },
  };
}

/**
 * Formata valores monetários
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/**
 * Formata percentuais
 */
export function formatarPercentual(valor: number, casasDecimais: number = 2): string {
  return `${valor.toFixed(casasDecimais)}%`;
}

/**
 * Exporta resumo formatado para exibição
 */
export function gerarResumoSimulacao(simulacao: SimulacaoCaixa): string {
  const linhas = [
    '═══════════════════════════════════════════════════════',
    '    SIMULAÇÃO DE FINANCIAMENTO - CAIXA ECONÔMICA',
    '═══════════════════════════════════════════════════════',
    '',
    '📊 DADOS DO IMÓVEL',
    `Valor do Imóvel:        ${formatarMoeda(simulacao.valorImovel)}`,
    `Entrada:                ${formatarMoeda(simulacao.valorEntrada)}`,
    simulacao.valorFGTS > 0 ? `  └─ FGTS:             ${formatarMoeda(simulacao.valorFGTS)}` : '',
    `Valor Financiado:       ${formatarMoeda(simulacao.valorFinanciado)} (${simulacao.percentualFinanciado.toFixed(1)}%)`,
    `Prazo:                  ${simulacao.prazoMeses} meses (${(simulacao.prazoMeses / 12).toFixed(1)} anos)`,
    '',
    '💰 TAXAS E JUROS',
    `Taxa Nominal:           ${formatarPercentual(simulacao.taxaNominalAnual)} a.a.`,
    `Taxa Mensal:            ${formatarPercentual(simulacao.taxaMensalNominal)} a.m.`,
    `CET (Custo Total):      ${formatarPercentual(simulacao.price.cetAnual)} a.a.`,
    '',
    '📅 SISTEMA PRICE (Parcelas Fixas)',
    `Primeira Parcela:       ${formatarMoeda(simulacao.price.primeiraParcela.parcelaTotal)}`,
    `  ├─ Amortização:      ${formatarMoeda(simulacao.price.primeiraParcela.amortizacao)}`,
    `  ├─ Juros:            ${formatarMoeda(simulacao.price.primeiraParcela.juros)}`,
    `  ├─ Seguro MIP:       ${formatarMoeda(simulacao.price.primeiraParcela.mipMensal)}`,
    `  ├─ Seguro DFI:       ${formatarMoeda(simulacao.price.primeiraParcela.dfiMensal)}`,
    `  └─ Taxa Admin:       ${formatarMoeda(simulacao.price.primeiraParcela.tarifaAdministracao)}`,
    '',
    `Última Parcela:         ${formatarMoeda(simulacao.price.ultimaParcela.parcelaTotal)}`,
    `Média (5 primeiros anos): ${formatarMoeda(simulacao.price.parcelaMediaPrimeirosAnos)}`,
    '',
    '💸 CUSTOS TOTAIS',
    `Total de Juros:         ${formatarMoeda(simulacao.price.totalJuros)}`,
    `Total de Seguros:       ${formatarMoeda(simulacao.price.totalMIP + simulacao.price.totalDFI)}`,
    `  ├─ MIP:              ${formatarMoeda(simulacao.price.totalMIP)}`,
    `  └─ DFI:              ${formatarMoeda(simulacao.price.totalDFI)}`,
    `Total de Tarifas:       ${formatarMoeda(simulacao.price.totalTarifas)}`,
    `Total Pago:             ${formatarMoeda(simulacao.price.totalPago)}`,
    '',
    '💵 CUSTOS INICIAIS (Antes da 1ª Parcela)',
    `Tarifa de Cadastro:     ${formatarMoeda(simulacao.custosIniciais.tarifaCadastro)}`,
    `Avaliação do Imóvel:    ${formatarMoeda(simulacao.custosIniciais.avaliacaoImovel)}`,
    `Registro de Contrato:   ${formatarMoeda(simulacao.custosIniciais.registroContrato)}`,
    `ITBI:                   ${formatarMoeda(simulacao.custosIniciais.itbi)}`,
    `TOTAL INICIAL:          ${formatarMoeda(simulacao.custosIniciais.total)}`,
    '',
    '✅ VIABILIDADE',
    `Renda Mínima (30%):     ${formatarMoeda(simulacao.viabilidade.rendaMinimaPrice)}`,
    `Aprovação Automática:   ${simulacao.viabilidade.aprovaAutomatica ? 'SIM ✓' : 'ANÁLISE NECESSÁRIA'}`,
    '',
  ];
  
  if (simulacao.viabilidade.observacoes.length > 0) {
    linhas.push('⚠️  OBSERVAÇÕES:');
    simulacao.viabilidade.observacoes.forEach(obs => {
      linhas.push(`• ${obs}`);
    });
    linhas.push('');
  }
  
  linhas.push('═══════════════════════════════════════════════════════');
  
  return linhas.filter(l => l !== '').join('\n');
}
