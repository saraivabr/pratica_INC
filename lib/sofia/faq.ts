/**
 * FAQ Dinâmico da Sofia - Assistente Virtual da Pratica Incorporadora
 * Organizado por categorias para facilitar a busca e manutenção
 */

export interface FAQCategory {
  nome: string;
  descricao: string;
  perguntas: Record<string, string>;
}

export interface FAQData {
  EMPRESA: FAQCategory;
  PROCESSOS: FAQCategory;
  APP: FAQCategory;
  FINANCEIRO: FAQCategory;
}

export const FAQ: FAQData = {
  EMPRESA: {
    nome: "Empresa",
    descricao: "Informações sobre a Pratica Incorporadora",
    perguntas: {
      "O que é a Pratica Incorporadora?":
        "A Pratica Incorporadora é uma empresa do setor imobiliário especializada no desenvolvimento e comercialização de empreendimentos residenciais. Trabalhamos com foco em qualidade, transparência e satisfação dos nossos clientes e parceiros corretores.",

      "Onde a Pratica Incorporadora atua?":
        "Atuamos principalmente na região metropolitana, com empreendimentos estrategicamente localizados em áreas de grande potencial de valorização e infraestrutura consolidada.",

      "Quais tipos de empreendimentos a Pratica oferece?":
        "Oferecemos empreendimentos residenciais variados, incluindo apartamentos de 2 e 3 quartos, coberturas e unidades com área privativa, sempre com acabamento de qualidade e áreas de lazer completas.",

      "Como posso me tornar um corretor parceiro?":
        "Para se tornar um corretor parceiro da Pratica, você precisa ter CRECI ativo e se cadastrar em nossa plataforma. Após a aprovação do cadastro, você terá acesso a todos os empreendimentos, materiais de apoio e ferramentas de simulação.",

      "A Pratica oferece treinamento para corretores?":
        "Sim! Oferecemos treinamentos regulares sobre nossos empreendimentos, técnicas de vendas e uso da plataforma. Fique atento às notificações no app para saber das próximas datas.",

      "Quais são os diferenciais da Pratica?":
        "Nossos diferenciais incluem: processo de vendas 100% digital, comissões competitivas, pagamento pontual, suporte dedicado aos corretores, materiais de marketing de alta qualidade e empreendimentos em localizações privilegiadas.",
    },
  },

  PROCESSOS: {
    nome: "Processos",
    descricao: "Como funcionam reservas, documentos, prazos e comissões",
    perguntas: {
      "Como funciona o processo de reserva de uma unidade?":
        "A reserva é feita diretamente pelo app. Após o cliente escolher a unidade e aprovar a simulação, você envia a proposta com os documentos necessários. A reserva fica válida por 48 horas úteis enquanto aguarda análise.",

      "Quais documentos são necessários para enviar uma proposta?":
        "Para pessoa física: RG, CPF, comprovante de residência, comprovante de renda (3 últimos contracheques ou declaração de IR) e certidão de estado civil. Para pessoa jurídica: contrato social, CNPJ, documentos dos sócios e balanço patrimonial.",

      "Qual o prazo para análise de uma proposta?":
        "O prazo médio de análise é de 24 a 48 horas úteis após o envio completo da documentação. Propostas com documentação incompleta podem ter o prazo estendido.",

      "Como funciona o pagamento da comissão?":
        "A comissão é paga em duas parcelas: 50% na assinatura do contrato e 50% após o registro da escritura. O pagamento é feito via transferência bancária na conta cadastrada.",

      "Qual o percentual de comissão?":
        "A comissão padrão é de 4% sobre o valor do imóvel. Em campanhas especiais, esse percentual pode ser maior. Consulte as condições vigentes na aba de empreendimentos.",

      "Posso cancelar uma reserva?":
        "Sim, a reserva pode ser cancelada pelo corretor ou pelo cliente antes da assinatura do contrato. Após a assinatura, aplicam-se as regras contratuais de distrato.",

      "Como acompanho o status das minhas propostas?":
        "No app, acesse a seção 'Propostas' para ver o status atualizado de todas as suas negociações. Você também recebe notificações a cada mudança de status.",

      "O que acontece se a proposta for recusada?":
        "Se a proposta for recusada, você receberá uma notificação com o motivo. Em muitos casos, é possível ajustar as condições ou solicitar nova análise com documentação complementar.",
    },
  },

  APP: {
    nome: "Aplicativo",
    descricao: "Como usar o app para simular, enviar propostas e ver relatórios",
    perguntas: {
      "Como faço uma simulação de financiamento?":
        "Na tela inicial, selecione o empreendimento e a unidade desejada. Clique em 'Simular' e preencha os dados do cliente (renda, entrada, prazo). O sistema calculará automaticamente as parcelas e condições disponíveis.",

      "Como envio uma proposta pelo app?":
        "Após fazer a simulação, clique em 'Enviar Proposta'. Preencha os dados completos do cliente, anexe os documentos solicitados e confirme o envio. Você receberá uma confirmação por e-mail e notificação.",

      "Onde vejo meus relatórios de vendas?":
        "Acesse o menu lateral e clique em 'Relatórios'. Lá você encontra o resumo de vendas, propostas em andamento, comissões a receber e histórico completo de transações.",

      "Como altero meus dados cadastrais?":
        "Vá em 'Configurações' no menu lateral, depois em 'Meu Perfil'. Lá você pode atualizar seus dados pessoais, bancários e de contato. Algumas alterações podem precisar de aprovação.",

      "O app funciona offline?":
        "Algumas funcionalidades básicas ficam disponíveis offline, como visualizar empreendimentos já carregados. Porém, para enviar propostas e fazer simulações atualizadas, é necessário conexão com a internet.",

      "Como recebo notificações do app?":
        "As notificações são enviadas automaticamente para o app e por e-mail. Verifique se as notificações estão habilitadas nas configurações do seu celular e se seu e-mail está correto no cadastro.",

      "Esqueci minha senha, como recupero?":
        "Na tela de login, clique em 'Esqueci minha senha'. Digite seu e-mail cadastrado e você receberá um link para criar uma nova senha. O link é válido por 24 horas.",

      "Como vejo os materiais de marketing dos empreendimentos?":
        "Dentro de cada empreendimento, há uma seção 'Materiais' com plantas, renders, vídeos e apresentações disponíveis para download e compartilhamento com seus clientes.",

      "Posso compartilhar simulações com o cliente?":
        "Sim! Após fazer a simulação, clique em 'Compartilhar'. Você pode enviar por WhatsApp, e-mail ou gerar um PDF para impressão. A simulação compartilhada fica válida por 7 dias.",
    },
  },

  FINANCEIRO: {
    nome: "Financeiro",
    descricao: "Informações sobre taxas, entrada mínima e prazos",
    perguntas: {
      "Qual a entrada mínima para financiamento?":
        "A entrada mínima é de 20% do valor do imóvel para a maioria dos empreendimentos. Em alguns casos especiais ou campanhas, pode haver condições diferenciadas com entrada a partir de 10%.",

      "Qual o prazo máximo de financiamento?":
        "O prazo máximo de financiamento é de 420 meses (35 anos) para clientes com idade compatível. O prazo é calculado considerando que a idade do comprador mais o prazo não ultrapasse 80 anos.",

      "Quais as taxas de juros praticadas?":
        "As taxas variam conforme o banco financiador e o perfil do cliente. Atualmente trabalhamos com taxas a partir de 9,99% ao ano + TR. Consulte a simulação para valores atualizados.",

      "Posso usar FGTS na compra?":
        "Sim, o FGTS pode ser utilizado para compor a entrada, amortizar saldo devedor ou pagar parte das parcelas, desde que o imóvel e o comprador atendam às regras do fundo.",

      "Quais as formas de pagamento da entrada?":
        "A entrada pode ser parcelada durante a obra em até 36 vezes, dependendo do empreendimento. Também aceitamos pagamento à vista com desconto especial.",

      "Existe taxa de corretagem?":
        "A taxa de corretagem já está incluída no valor do imóvel informado. Não há cobrança adicional para o cliente.",

      "Como funciona o reajuste das parcelas durante a obra?":
        "As parcelas pagas durante a obra são reajustadas mensalmente pelo INCC (Índice Nacional de Custo da Construção). Após a entrega das chaves, o saldo é corrigido pela TR.",

      "Qual o valor do condomínio estimado?":
        "O valor estimado do condomínio varia conforme o empreendimento e está disponível na ficha técnica de cada um. Geralmente fica entre R$ 300 e R$ 600 para apartamentos padrão.",

      "Há desconto para pagamento à vista?":
        "Sim! Oferecemos descontos especiais para pagamento à vista ou com entrada maior. Consulte as condições específicas de cada empreendimento ou fale com nosso time comercial.",

      "O que está incluso no valor do imóvel?":
        "O valor inclui a unidade com acabamento padrão conforme memorial descritivo, vaga de garagem (quando aplicável) e áreas comuns entregues conforme projeto. ITBI, registro e escritura são pagos à parte pelo comprador.",
    },
  },
};

/**
 * Função auxiliar para buscar respostas no FAQ
 * @param pergunta - Texto da pergunta a ser buscada
 * @returns Resposta encontrada ou null
 */
export function buscarNoFAQ(pergunta: string): string | null {
  const perguntaLower = pergunta.toLowerCase();

  for (const categoria of Object.values(FAQ)) {
    for (const [p, resposta] of Object.entries(categoria.perguntas) as [string, string][]) {
      if (p.toLowerCase().includes(perguntaLower) || perguntaLower.includes(p.toLowerCase())) {
        return resposta;
      }
    }
  }

  return null;
}

/**
 * Função para listar todas as perguntas de uma categoria
 * @param categoriaKey - Chave da categoria (EMPRESA, PROCESSOS, APP, FINANCEIRO)
 * @returns Array com todas as perguntas da categoria
 */
export function listarPerguntasCategoria(
  categoriaKey: keyof FAQData
): string[] {
  const categoria = FAQ[categoriaKey];
  return categoria ? Object.keys(categoria.perguntas) : [];
}

/**
 * Função para obter todas as categorias disponíveis
 * @returns Array com informações resumidas das categorias
 */
export function listarCategorias(): Array<{ key: string; nome: string; descricao: string }> {
  return Object.entries(FAQ).map(([key, categoria]) => ({
    key,
    nome: categoria.nome,
    descricao: categoria.descricao,
  }));
}

export default FAQ;
