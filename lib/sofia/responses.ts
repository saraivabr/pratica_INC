/**
 * Templates de Respostas da Sofia
 *
 * Mensagens pré-definidas para cada fluxo e situação
 */

import { SOFIA } from './persona';

// ============================================
// ONBOARDING - Novo Corretor
// ============================================

export const ONBOARDING = {
  // Fase 1: Acolhimento
  acolhimento: (nome: string) => `Oi, ${nome}! 👋`,
  apresentacao: () => `Sou a ${SOFIA.nome}, especialista comercial aqui na Pratica!`,

  // Fase 2: Contextualização
  contexto: (gerente: string, imobiliaria: string) =>
    `O ${gerente} da ${imobiliaria} te adicionou no sistema. Bem-vindo ao time! 🎉`,

  // Fase 3: Proposta de valor
  proposta: () =>
    `Vou te ajudar a vender mais! Posso te mandar tabelas, simular financiamento e muito mais.`,

  // Fase 4: Call-to-action
  cta: (appUrl: string) =>
    `Pra começar, acessa o app:\n👉 ${appUrl}\n\nQualquer dúvida, é só me chamar! 🚀`,
};

// ============================================
// SAUDAÇÕES
// ============================================

export const SAUDACOES = {
  // Primeira interação do dia
  bomDia: (nome: string) => `Bom dia, ${nome}! Bora acelerar suas vendas hoje?`,
  boaTarde: (nome: string) => `Boa tarde, ${nome}! Tamo junto pra fechar negócios.`,
  boaNoite: (nome: string) => `Boa noite, ${nome}! Me chama que eu destravo o que precisar.`,

  // Resposta a "oi"
  oi: (nome: string) => `Fala ${nome}! Bora resolver o que ta travando?`,
  oiRetorno: (nome: string) => `Voltou, ${nome}! Me diz onde posso ajudar agora.`,

  // Resposta a "tudo bem?"
  tudoBem: (nome: string) =>
    `Tudo certo por aqui, ${nome}! Qual frente quer atacar agora?`,

  comImobiliaria: (nome: string, imobiliaria: string) =>
    `Fala ${nome}! Aqui é a Sofia, sua parceira da ${imobiliaria}. Me diz: qual cliente você quer avançar hoje?`,

  // Quem é você?
  identidade: () =>
    `Sou a ${SOFIA.nome}, sua parceira comercial da Pratica. Te ajudo a destravar venda, achar unidade certa e fechar mais rapido. 😊`,

  // O que você faz?
  capacidades: () =>
    `Posso te ajudar com:\n• 📊 Tabelas\n• 💰 Simulações\n• 🏠 Imóveis da Pratica\n• 📱 Materiais de venda\n• 🧠 Argumentos pra objeções\n\nO que você precisa agora?`,
};

// ============================================
// BUSCA DE IMÓVEIS
// ============================================

export const BUSCA = {
  // Qualificação
  paraQuem: (nome: string) => `Opa ${nome}! Pra qual cliente você tá buscando?`,
  filtros: () => `Se quiser filtrar, manda quartos e faixa de preco. Se nao, escolhe um bairro.`,
  entendi: () => `Fechado! Pra eu ser certeira, me passa bairro, quartos ou faixa de preco.`,

  // Resultados
  encontrei: (quantidade: number) =>
    `Achei ${quantidade} ${quantidade === 1 ? 'opção que encaixa' : 'opções que encaixam'}:`,

  // Formatação de empreendimento
  empreendimento: (data: {
    nome: string;
    quartos: number;
    metragem: number;
    preco: number;
    disponiveis: number;
  }) => {
    const urgencia = data.disponiveis <= 2 ? ' ⚡' : '';
    return `🏢 *${data.nome}* - ${data.quartos} quartos, ${data.metragem}m²\n   R$ ${data.preco.toLocaleString('pt-BR')} - ${data.disponiveis} disponíve${data.disponiveis === 1 ? 'l' : 'is'}${urgencia}`;
  },

  // Engajamento
  qualInteressou: () =>
    `Qual te interessou mais? Posso mandar a tabela completa ou simular na hora! 📊`,

  // Sem resultados
  semResultados: () =>
    `Não encontrei imóveis com esses filtros. 😕 Quer tentar com outros critérios?`,
};

// ============================================
// SIMULAÇÃO FINANCEIRA
// ============================================

export const SIMULACAO = {
  // Início
  inicio: () => `Bora simular! 💰`,
  qualValor: () => `Qual o valor do imóvel?`,
  confirmaValor: (valor: number) =>
    `R$ ${valor.toLocaleString('pt-BR')}, certo? Quanto de entrada você tá pensando? (em % ou valor)`,

  // Resultado
  resultado: () => `Simulei aqui! 📊`,
  detalhes: (data: {
    entrada: number;
    percentualEntrada: number;
    parcela: number;
    prazo: number;
    taxa: number;
  }) =>
    `💵 *Entrada:* R$ ${data.entrada.toLocaleString('pt-BR')} (${data.percentualEntrada}%)\n📅 *Parcela:* R$ ${data.parcela.toLocaleString('pt-BR')}/mês em ${data.prazo}x\n📈 *Taxa:* ${data.taxa}% ao ano`,

  // Resultado CEF (Com breakdown completo)
  resultadoCEF: () => `Calculei pelo padrão *Caixa Econômica*! 🏦📊`,
  detalhesCEF: (data: {
    entrada: number;
    percentualEntrada: number;
    valorFinanciado: number;
    parcelaTotal: number;
    parcelaBase: number;
    seguros: number;
    tarifas: number;
    prazo: number;
    taxaNominal: number;
    cetAnual: number;
    rendaMinima: number;
  }) => {
    const linhas = [
      `💵 *Entrada:* R$ ${data.entrada.toLocaleString('pt-BR')} (${data.percentualEntrada}%)`,
      `💰 *Financiado:* R$ ${data.valorFinanciado.toLocaleString('pt-BR')}`,
      ``,
      `📅 *Parcela Total:* R$ ${data.parcelaTotal.toLocaleString('pt-BR')}/mês`,
      `   ├ Amortização + Juros: R$ ${data.parcelaBase.toLocaleString('pt-BR')}`,
      `   ├ Seguros (MIP + DFI): R$ ${data.seguros.toLocaleString('pt-BR')}`,
      `   └ Taxa Administrativa: R$ ${data.tarifas.toLocaleString('pt-BR')}`,
      ``,
      `📈 *Taxa Nominal:* ${data.taxaNominal.toFixed(2)}% a.a.`,
      `🔍 *CET (Custo Real):* ${data.cetAnual.toFixed(2)}% a.a.`,
      ``,
      `💼 *Renda Mínima:* R$ ${data.rendaMinima.toLocaleString('pt-BR')}`,
      `⏱️ *Prazo:* ${data.prazo} meses (${Math.floor(data.prazo/12)} anos)`,
    ];
    return linhas.join('\n');
  },

  // Observação sobre CET
  explicaCET: () => 
    `O *CET* é o custo total incluindo juros + seguros + tarifas. É o valor real que você paga! 💡`,

  // Comparação psicológica
  comparacao: (parcela: number) =>
    `Isso dá menos que um aluguel de 2 quartos na mesma região! 😉`,

  // Próximos passos
  proximosPassos: () =>
    `Quer que eu simule com outra entrada? Ou prefere que eu mande essa simulação bonitinha pro seu cliente? 📱`,
  
  proximosPassosCEF: () =>
    `Posso te mandar um PDF completo com essa simulação. Quer em PDF ou via app? 📱`,

  // Erro de valor
  valorInvalido: () =>
    `Não entendi o valor. Pode me passar em reais? (ex: 400000 ou 400.000)`,
};

// ============================================
// TABELA DE PREÇOS
// ============================================

export const TABELA = {
  // Solicitação
  qualEmpreendimento: () => `De qual empreendimento você quer a tabela?`,
  enviando: (nome: string) => `Preparando a tabela do *${nome}*... 📊`,

  // Unidade específica
  unidade: (data: {
    numero: string;
    tipo?: string;
    metragem: number;
    quartos: number;
    preco: number;
    status: string;
  }) => {
    const statusEmoji =
      data.status === 'disponivel' ? '✅' : data.status === 'reservado' ? '⏳' : '❌';
    return `${statusEmoji} *Unidade ${data.numero}*\n${data.tipo ? `Tipo: ${data.tipo}\n` : ''}${data.metragem}m² | ${data.quartos} quartos\n*R$ ${data.preco.toLocaleString('pt-BR')}*`;
  },

  // Comparação
  maisBarat: (unidade: string, preco: number) =>
    `A mais em conta é a *${unidade}* por R$ ${preco.toLocaleString('pt-BR')}! 💰`,
};

// ============================================
// SUPORTE / ERRO
// ============================================

export const SUPORTE = {
  // Validação emocional
  desculpa: () => `Poxa, desculpa pelo transtorno! 😔`,
  meContaOQueFoi: () => `Me conta o que aconteceu que eu vejo como resolver.`,

  // Diagnóstico
  qualErro: () => `Tá dando alguma mensagem de erro específica?`,
  verificando: () => `Deixa eu verificar no sistema...`,
  achei: (problema: string) => `Achei! O problema era ${problema}, já corrigi.`,

  // Escalação
  escalando: (gerente: string) =>
    `Entendo que isso é importante pra você. Vou chamar o ${gerente} pra te ajudar pessoalmente. Ele vai te responder em instantes! 🤝`,

  // Fora do horário
  foraDoHorario: () =>
    `Nosso time não tá disponível agora, mas deixa sua mensagem que amanhã logo cedo alguém te retorna! 🌙`,

  // Erro genérico
  erroGenerico: () => `Ops, tive um probleminha técnico. 😅`,
  tentarNovamente: () => `Pode repetir?`,
};

// ============================================
// FEEDBACK
// ============================================

export const FEEDBACK = {
  // Positivo
  deNada: (nome: string) => `Imagina, ${nome}! Sempre que precisar, tô aqui! 😊`,
  queBom: () => `Que bom! Quer que eu mande mais alguma coisa?`,

  // Negativo
  desculpaErro: () => `Desculpa, deixa eu entender melhor o que você precisa.`,
  oQueEsperava: () => `O que você esperava receber?`,

  // Sugestão
  obrigadoSugestao: () =>
    `Obrigada pela sugestão! Vou passar pro time de produto! 💡`,
};

// ============================================
// NÃO CADASTRADO
// ============================================

export const NAO_CADASTRADO = {
  mensagem: () => `Olá! Você ainda não está cadastrado no sistema.`,
  instrucao: () =>
    `Peça ao seu gerente para te adicionar compartilhando seu contato comigo aqui no WhatsApp. 📱`,
};

// ============================================
// CADASTRO CONVERSACIONAL (ONBOARDING INTERATIVO)
// ============================================

export const CADASTRO = {
  // Micro transições - Introdução
  intro1: () => `Opa! 👋`,
  intro2: () => `Vejo que é sua primeira vez por aqui...`,
  intro3: () => `Bora fazer um cadastro rapidinho? 🚀`,
  
  // Verificando informações
  verificando: () => `Deixa eu ver se acho você na base... 🔍`,
  encontreiCVCRM: (nome: string) => `Achei você! Você é ${nome}, certo? ✅`,
  confirmaNome: () => `Confirma seu nome? (Responde "sim" ou me diga como quer ser chamado)`,
  
  // Pedindo nome (se não encontrou)
  pedirNome: () => `Qual é seu nome?`,
  bemVindo: (nome: string) => `Prazer, ${nome}! 😊`,
  
  // Perguntando sobre imobiliária
  verificandoImobiliaria: () => `Agora... sobre a imobiliária...`,
  pedirImobiliaria: () => `De qual imobiliária você é?`,
  pedirImobiliariaRapido: () => `(Se for autônomo, só manda "autonomo" mesmo)`,
  
  // Confirmações interativas
  acheiImobiliaria: (nome: string) => `Encontrei a ${nome}! 🏢`,
  confirmandoImobiliaria: (nome: string) => `Você é da ${nome}, né?`,
  
  // Perguntando sobre gerente
  ultimaPergunta: () => `Última pergunta...`,
  pedirGerente: () => `Quem é seu gerente?`,
  pedirGerenteOpcional: () => `(Se não tiver, só responde "nao tenho")`,
  
  // Progresso visual
  progresso1: () => `✓ Nome`,
  progresso2: () => `✓ Nome ✓ Imobiliária`,
  progresso3: () => `✓ Nome ✓ Imobiliária ✓ Gerente`,
  
  // Finalizando
  processando: () => `Processando... ⏳`,
  sucesso: () => `Pronto! 🎉`,
  confirmacao: (nome: string) => `Bem-vindo ao time, ${nome}!`,
  
  // Link do app com emojis animados
  acessoApp: () => `Agora você já pode acessar tudo pelo app! 📱`,
  appLink: (appUrl: string) => `👉 ${appUrl}`,
  
  // Call to action rápido
  proximoPasso: () => `Quer ver os empreendimentos ou fazer uma simulação?`,
  opcoes: () => `Manda "imoveis" pra ver o portfólio ou "simular" pra calcular na hora! 💰`,
  
  // Erros amigáveis
  erroNome: () => `Ops, não entendi... 😅\nPode me dizer seu nome de novo?`,
  erroImobiliaria: () => `Hmm, não achei essa imobiliária.\nMe diz o nome dela novamente?`,
  erroGerente: () => `Não encontrei esse gerente.\n(Mas tudo bem, se não tiver, manda "nao")`,
  
  // Feedback de digitação (para usar com typing indicators)
  digitando: () => `...`,
};

// ============================================
// AGENDA
// ============================================

export const AGENDA = {
  // Com compromissos
  comCompromissos: (nome: string, quantidade: number) =>
    `Oi ${nome}! 📅 Você tem ${quantidade} ${quantidade === 1 ? 'compromisso' : 'compromissos'} agendado${quantidade === 1 ? '' : 's'} para hoje:`,

  // Sem compromissos
  semCompromissos: (nome: string) =>
    `Oi ${nome}! Sua agenda tá livre hoje. 🎉 Bora aproveitar pra prospectar?`,

  // Lembrete
  lembrete: (titulo: string, horario: string) =>
    `⏰ *Lembrete:* ${titulo} às ${horario}. Não esquece, hein! 😉`,
};

// ============================================
// CAMPANHA
// ============================================

export const CAMPANHA = {
  // Campanha ativa
  ativa: (nome: string, empreendimento: string, descricao: string) =>
    `🔥 *Campanha Ativa:* ${nome}\n\n🏢 Empreendimento: ${empreendimento}\n📋 ${descricao}\n\nAproveita pra fechar mais vendas! 💪`,

  // Sem campanha
  semCampanha: () =>
    `No momento não tem nenhuma campanha ativa. 😊 Mas fica de olho que logo sai novidade!`,
};

// ============================================
// AJUDA_APP
// ============================================

export const AJUDA_APP = {
  // Passo a passo - Simulação
  simulacao: () =>
    `📱 *Como fazer uma simulação no app:*\n\n1️⃣ Acesse o menu "Simulador"\n2️⃣ Selecione o empreendimento\n3️⃣ Escolha a unidade desejada\n4️⃣ Informe o valor de entrada\n5️⃣ Clique em "Simular"\n6️⃣ Pronto! Veja o resultado e compartilhe com seu cliente 🚀`,

  // Passo a passo - Proposta
  proposta: () =>
    `📱 *Como criar uma proposta no app:*\n\n1️⃣ Acesse o menu "Propostas"\n2️⃣ Clique em "Nova Proposta"\n3️⃣ Selecione o cliente (ou cadastre um novo)\n4️⃣ Escolha o empreendimento e unidade\n5️⃣ Preencha as condições comerciais\n6️⃣ Revise os dados e clique em "Enviar"\n7️⃣ Acompanhe o status na lista de propostas 📋`,

  // Passo a passo - Relatórios
  relatorios: () =>
    `📱 *Como acessar seus relatórios no app:*\n\n1️⃣ Acesse o menu "Relatórios"\n2️⃣ Escolha o tipo de relatório desejado\n3️⃣ Selecione o período de análise\n4️⃣ Clique em "Gerar Relatório"\n5️⃣ Visualize os dados na tela ou exporte em PDF 📊`,

  // Passo a passo - Comissões
  comissoes: () =>
    `📱 *Como consultar suas comissões no app:*\n\n1️⃣ Acesse o menu "Comissões"\n2️⃣ Veja o resumo das comissões pendentes e pagas\n3️⃣ Clique em uma venda para ver os detalhes\n4️⃣ Filtre por período ou status se precisar\n5️⃣ Acompanhe as datas de pagamento previstas 💰`,
};

// ============================================
// STATUS DE PROCESSOS
// ============================================

export const STATUS = {
  // Processo encontrado
  encontrado: (data: {
    protocolo: string;
    status: string;
    etapa: string;
    dataAtualizacao: string;
  }) =>
    `✅ *Processo ${data.protocolo}*\n\n📋 Status: ${data.status}\n📍 Etapa atual: ${data.etapa}\n🕐 Última atualização: ${data.dataAtualizacao}`,

  // Processo não encontrado
  naoEncontrado: (protocolo: string) =>
    `❌ Não encontrei nenhum processo com o número *${protocolo}*.\n\nConfere se digitou certo? Se precisar, manda de novo! 🔎`,

  // Múltiplos processos encontrados
  multiplos: (quantidade: number) =>
    `📂 Encontrei *${quantidade} processos* vinculados a você:\n\nQual deles você quer consultar? Manda o número do protocolo! 🔍`,
};

// ============================================
// COMISSÕES
// ============================================

export const COMISSAO = {
  // Resumo geral de comissões
  resumo: (data: {
    totalReceber: number;
    totalRecebido: number;
    quantidadeVendas: number;
    periodo: string;
  }) =>
    `💰 *Resumo de Comissões - ${data.periodo}*\n\n📊 Vendas no período: ${data.quantidadeVendas}\n✅ Recebido: R$ ${data.totalRecebido.toLocaleString('pt-BR')}\n⏳ A receber: R$ ${data.totalReceber.toLocaleString('pt-BR')}`,

  // Detalhe de uma comissão específica
  detalhe: (data: {
    empreendimento: string;
    unidade: string;
    valorVenda: number;
    comissao: number;
    percentual: number;
    status: string;
    previsaoPagamento?: string;
  }) => {
    const linhas = [
      `💵 *Comissão - ${data.empreendimento}*`,
      ``,
      `🏠 Unidade: ${data.unidade}`,
      `💰 Valor da venda: R$ ${data.valorVenda.toLocaleString('pt-BR')}`,
      `📈 Comissão (${data.percentual}%): *R$ ${data.comissao.toLocaleString('pt-BR')}*`,
      `📋 Status: ${data.status}`,
    ];
    if (data.previsaoPagamento) {
      linhas.push(`📅 Previsão de pagamento: ${data.previsaoPagamento}`);
    }
    return linhas.join('\n');
  },

  // Sem comissões no período
  semComissao: (periodo: string) =>
    `😕 Não encontrei comissões registradas em *${periodo}*.\n\nQuer ver outro período? Me manda o mês que eu busco pra você! 📅`,
};

// ============================================
// METAS E DESEMPENHO
// ============================================

export const METAS = {
  // Resultado positivo (>70%)
  positivo: (data: {
    nome: string;
    percentualAtingido: number;
    metaValor: number;
    realizado: number;
    faltam: number;
    diasRestantes: number;
  }) =>
    `🚀 *Parabéns, ${data.nome}!*\n\n📊 Você já atingiu *${data.percentualAtingido}%* da meta!\n\n✅ Meta: R$ ${data.metaValor.toLocaleString('pt-BR')}\n💰 Realizado: R$ ${data.realizado.toLocaleString('pt-BR')}\n📈 Faltam: R$ ${data.faltam.toLocaleString('pt-BR')}\n⏰ Dias restantes: ${data.diasRestantes}\n\nContinua assim que você fecha o mês voando! 🔥`,

  // Resultado atenção (<70%)
  atencao: (data: {
    nome: string;
    percentualAtingido: number;
    metaValor: number;
    realizado: number;
    faltam: number;
    diasRestantes: number;
  }) =>
    `⚠️ *Atenção, ${data.nome}!*\n\n📊 Você está com *${data.percentualAtingido}%* da meta.\n\n🎯 Meta: R$ ${data.metaValor.toLocaleString('pt-BR')}\n💰 Realizado: R$ ${data.realizado.toLocaleString('pt-BR')}\n📈 Faltam: R$ ${data.faltam.toLocaleString('pt-BR')}\n⏰ Dias restantes: ${data.diasRestantes}\n\nBora acelerar! Quer que eu te mostre os imóveis com mais saída? 💪`,

  // Ranking de corretores
  ranking: (data: {
    posicao: number;
    totalCorretores: number;
    topCorretores: Array<{ nome: string; percentual: number }>;
  }) => {
    const posicaoEmoji = data.posicao === 1 ? '🥇' : data.posicao === 2 ? '🥈' : data.posicao === 3 ? '🥉' : '📍';
    const linhas = [
      `🏆 *Ranking do Mês*`,
      ``,
      `${posicaoEmoji} Sua posição: *${data.posicao}º* de ${data.totalCorretores}`,
      ``,
      `*Top 3:*`,
    ];
    data.topCorretores.slice(0, 3).forEach((corretor, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      linhas.push(`${medal} ${corretor.nome} - ${corretor.percentual}%`);
    });
    return linhas.join('\n');
  },
};

// ============================================
// OBJECAO - Respostas para objecoes de clientes
// ============================================

export const OBJECAO = {
  // Objecao de preco alto
  caro: (nomeEmpreendimento?: string) => {
    const empreendimento = nomeEmpreendimento ? ` do ${nomeEmpreendimento}` : '';
    return `Entendo sua preocupacao com o valor${empreendimento}. 💡

Mas vamos pensar juntos: voce nao esta pagando um preco, esta fazendo um *investimento*. Esse imovel valoriza enquanto o aluguel so vai embora todo mes.

Compare: em 3 anos de aluguel de R$ 2.000, voce gasta R$ 72.000 sem ter nada. Aqui, esse dinheiro constroi patrimonio! 🏠

E tem mais: conseguimos parcelamentos que cabem no bolso. Posso simular com diferentes entradas pra encontrar a melhor opcao?`;
  },

  // Objecao de localizacao
  longe: (nomeEmpreendimento?: string, beneficios?: string) => {
    const empreendimento = nomeEmpreendimento ? `O ${nomeEmpreendimento} ` : 'Essa regiao ';
    const beneficiosTexto = beneficios || 'acesso facil as principais vias, mercados, escolas e transporte publico';
    return `${empreendimento}pode parecer distante a primeira vista, mas deixa eu te mostrar outro angulo. 🗺️

A localizacao oferece: ${beneficiosTexto}.

E sabe o que mais? Regioes em desenvolvimento tendem a valorizar muito mais! Quem compra agora, colhe os frutos depois. 📈

Alem disso, o valor mais acessivel permite um imovel maior ou uma entrada menor. Quer que eu mostre os numeros?`;
  },

  // Objecao de tamanho
  pequeno: (metragem?: number) => {
    const metrosTexto = metragem ? `Os ${metragem}m² ` : 'O espaco ';
    return `${metrosTexto}pode parecer compacto, mas a planta foi pensada pra aproveitar cada cantinho! 📐

Imoveis modernos sao projetados com inteligencia:
• Ambientes integrados que ampliam a sensacao de espaco
• Varanda que funciona como extensao da sala
• Area de servico otimizada
• Armarios planejados que maximizam a organizacao

E pensa comigo: um imovel menor significa condominio menor, IPTU menor, manutencao menor... Economia todo mes no bolso! 💰

Quer dar uma olhada na planta pra visualizar melhor?`;
  },

  // Objecao generica / preciso pensar
  generico: (nome?: string) => {
    const nomeTexto = nome ? `${nome}, ` : '';
    return `${nomeTexto}faz todo sentido querer pensar com calma. Decisao importante merece atencao! 👍

Enquanto voce analisa, me diz: o que mais te preocupa? Valor? Localizacao? Prazo? Se me contar, posso te ajudar a ter mais clareza.

E fica tranquilo: nao quero te pressionar, quero te ajudar a tomar a melhor decisao. Se esse nao for o imovel certo, a gente procura outro juntos. 🤝

Posso te mandar um resumo com as principais informacoes pra voce analisar com calma?`;
  },
};

// ============================================
// CONCORRENCIA - Argumentos sobre a Pratica
// ============================================

export const CONCORRENCIA = {
  // Diferenciais da Pratica
  diferenciais: () =>
    `A Pratica nao e so mais uma construtora. Olha so o que nos diferencia: 🏆

*Entrega no prazo* - Historico comprovado de obras entregues conforme prometido
*Acabamento de qualidade* - Materiais de primeira linha e atencao aos detalhes
*Atendimento humanizado* - Do primeiro contato as chaves, voce tem suporte real
*Transparencia total* - Acompanhe sua obra pelo app, sem surpresas
*Pos-venda ativo* - Assistencia tecnica rapida e eficiente

Construimos mais que imoveis, construimos confianca! 💪

Quer conhecer algum empreendimento entregue pra ver de perto?`,

  // Comparativo com concorrencia
  comparativo: (concorrente?: string) => {
    const concorrenteTexto = concorrente ? `a ${concorrente}` : 'outras construtoras';
    return `Respeito muito ${concorrenteTexto} e cada empresa tem seu valor. Mas vou te contar o que nossos clientes mais destacam sobre a Pratica: 📊

*Custo-beneficio:* Preco justo com qualidade que voce ve e sente
*Credibilidade:* Anos de mercado sem problemas de entrega
*Flexibilidade:* Condicoes de pagamento que se adaptam a sua realidade
*Proximidade:* Time comercial presente do inicio ao fim

No fim das contas, imovel e uma compra pra vida. Vale a pena escolher quem voce confia. 🤝

Posso te apresentar depoimentos de clientes ou mostrar obras entregues?`;
  },

  // Por que escolher a Pratica
  porquePratica: () =>
    `Por que a Pratica? Deixa eu te contar! ✨

*1. Confianca:* Decadas construindo sonhos - literalmente
*2. Localizacao:* Empreendimentos em bairros estrategicos que valorizam
*3. Projeto:* Plantas inteligentes aprovadas por quem entende de morar bem
*4. Facilidade:* Financiamento descomplicado, a gente ajuda em tudo
*5. Suporte:* Time de especialistas prontos pra te atender

A gente sabe que comprar um imovel e uma das maiores decisoes da vida. Por isso trabalhamos pra tornar essa jornada mais leve e segura. 🏠💙

Bora conhecer as opcoes que combinam com voce?`,
};

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Obtém saudação baseada no horário
 */
export function getSaudacaoHorario(nome: string): string {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) {
    return SAUDACOES.bomDia(nome);
  } else if (hora >= 12 && hora < 18) {
    return SAUDACOES.boaTarde(nome);
  } else {
    return SAUDACOES.boaNoite(nome);
  }
}

/**
 * Divide mensagem longa em partes menores
 */
export function splitMessage(message: string, maxLength = 300): string[] {
  if (message.length <= maxLength) {
    return [message];
  }

  const parts: string[] = [];

  // Primeiro, tenta dividir por parágrafos duplos
  const paragraphs = message.split(/\n\n+/);
  let currentPart = '';

  for (const paragraph of paragraphs) {
    if (currentPart && currentPart.length + paragraph.length > maxLength) {
      parts.push(currentPart.trim());
      currentPart = paragraph;
    } else {
      currentPart = currentPart ? `${currentPart}\n\n${paragraph}` : paragraph;
    }
  }

  if (currentPart.trim()) {
    parts.push(currentPart.trim());
  }

  // Se ainda tiver partes muito longas, divide por sentenças
  const finalParts: string[] = [];
  for (const part of parts) {
    if (part.length > maxLength * 1.3) {
      const sentences = part.split(/(?<=[.!?])\s+/);
      let currentChunk = '';

      for (const sentence of sentences) {
        if (currentChunk && currentChunk.length + sentence.length > maxLength) {
          finalParts.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
        }
      }
      if (currentChunk.trim()) {
        finalParts.push(currentChunk.trim());
      }
    } else {
      finalParts.push(part);
    }
  }

  return finalParts.length > 0 ? finalParts : [message];
}
