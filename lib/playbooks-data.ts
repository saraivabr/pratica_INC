// Playbooks de Vendas - Dados estáticos pré-gerados
// Para regenerar: npx ts-node scripts/generate-playbooks.ts

export interface PlaybookData {
  argumentosVenda: string[];
  publicoAlvo: {
    perfis: string[];
    motivacoes: string[];
  };
  objecoes: {
    objecao: string;
    resposta: string;
  }[];
  comparativo: {
    categoria: string;
    vantagem: string;
  }[];
  scripts: {
    situacao: string;
    script: string;
  }[];
  geradoEm: string;
}

export const playbooks: Record<string, PlaybookData> = {
  "1": {
    argumentosVenda: [
      "Localização privilegiada a apenas 150m do Metrô Oratório - mobilidade urbana incomparável para quem trabalha em qualquer região de São Paulo",
      "Vista permanente para o Parque Vila Ema - qualidade de vida com área verde preservada em frente ao empreendimento",
      "Empreendimento PRONTO para morar - sem riscos de atraso de obra, você pode se mudar imediatamente",
      "Lazer completo com mais de 15 itens incluindo piscina, academia, coworking e espaço pet - tudo que sua família precisa sem sair de casa",
      "Flexibilidade de plantas: studios, 1, 2 e 3 dormitórios - opções para todos os momentos da vida",
      "Valorização garantida: região em forte crescimento com nova linha de metrô e desenvolvimento comercial",
      "Entrada facilitada a partir de 10% e financiamento de até 70% do valor - condições que cabem no seu bolso"
    ],
    publicoAlvo: {
      perfis: [
        "Jovens profissionais (25-35 anos) que trabalham no centro ou zona leste e buscam primeiro imóvel próprio com fácil acesso ao metrô",
        "Casais em início de vida conjugal que querem sair do aluguel e ter um lar com estrutura de lazer completa",
        "Investidores que buscam imóveis prontos para locação em região com alta demanda por proximidade ao metrô",
        "Famílias com filhos pequenos que valorizam segurança, áreas verdes e playground no condomínio",
        "Profissionais liberais e freelancers que precisam de espaço coworking e home office bem estruturado"
      ],
      motivacoes: [
        "Sair do aluguel e construir patrimônio próprio",
        "Reduzir tempo de deslocamento para o trabalho",
        "Ter acesso a lazer completo sem custos extras",
        "Morar próximo a áreas verdes e parques",
        "Investir em imóvel com alta liquidez"
      ]
    },
    objecoes: [
      {
        objecao: "O preço está acima do meu orçamento",
        resposta: "Entendo sua preocupação com o investimento. Vamos analisar juntos: com entrada de apenas 10% e parcelas mensais durante a obra, o valor fica muito próximo de um aluguel na região. A diferença é que aqui você está construindo patrimônio. Posso fazer uma simulação personalizada para o seu perfil?"
      },
      {
        objecao: "Preciso pensar mais / vou ver outras opções",
        resposta: "Claro, é uma decisão importante e merece reflexão. Só quero te alertar que temos apenas 23 unidades disponíveis e a procura está alta por conta da localização única próxima ao metrô. Que tal eu reservar esta unidade por 48h enquanto você avalia? Assim você não corre o risco de perder essa oportunidade."
      },
      {
        objecao: "A região da Vila Ema é muito longe",
        resposta: "Essa é uma percepção comum de quem não conhece a nova realidade da região. Com o Metrô Oratório a 150 metros, você chega ao centro em 25 minutos. Além disso, a Vila Ema tem se valorizado muito com novos comércios e serviços. Muitos moradores relatam que a qualidade de vida aqui é muito superior a bairros mais centrais."
      },
      {
        objecao: "Não sei se consigo financiamento",
        resposta: "Ótima preocupação! Trabalhamos com os principais bancos e temos parceria com correspondentes bancários que conseguem as melhores taxas. Posso fazer uma pré-análise do seu perfil agora mesmo, sem compromisso. Em 5 minutos sabemos sua capacidade de financiamento."
      },
      {
        objecao: "As unidades são muito pequenas",
        resposta: "Os apartamentos foram projetados com plantas inteligentes que otimizam cada metro quadrado. Temos opções de 22m² até 60m². E lembre-se: você tem todo o lazer do condomínio como extensão do seu apartamento - coworking para trabalhar, academia para treinar, espaço gourmet para receber amigos. É como ter um apartamento muito maior!"
      },
      {
        objecao: "Vou esperar o mercado melhorar",
        resposta: "Entendo o raciocínio, mas historicamente os imóveis em São Paulo só valorizam. Este empreendimento já valorizou 15% desde o lançamento. Com a Selic em queda, a tendência é que os preços subam ainda mais nos próximos meses. Comprar agora é garantir o preço atual e ainda aproveitar as melhores condições de financiamento."
      }
    ],
    comparativo: [
      {
        categoria: "Localização",
        vantagem: "Único empreendimento da região a 150m do metrô E em frente a um parque - combinação rara de mobilidade e qualidade de vida"
      },
      {
        categoria: "Lazer",
        vantagem: "18 itens de lazer incluindo coworking e pet place - mais completo que 90% dos empreendimentos da faixa de preço"
      },
      {
        categoria: "Entrega",
        vantagem: "Pronto para morar - zero risco de atraso, você pode se mudar em 30 dias"
      },
      {
        categoria: "Preço por m²",
        vantagem: "R$ 9.800/m² - abaixo da média de R$ 11.500/m² para imóveis próximos ao metrô em SP"
      },
      {
        categoria: "Condições",
        vantagem: "Entrada de 10% + parcelas mensais - uma das menores entradas do mercado para imóvel pronto"
      }
    ],
    scripts: [
      {
        situacao: "Primeiro contato",
        script: "Olá! Tudo bem? Vi que você demonstrou interesse no Station Park. É um empreendimento incrível - pronto para morar, a 150m do metrô Oratório e em frente ao Parque Vila Ema. Temos studios a partir de R$ 217 mil e apartamentos de até 3 dormitórios. Qual tipo de imóvel você está buscando? Assim posso te mostrar as melhores opções disponíveis."
      },
      {
        situacao: "Follow-up",
        script: "Oi! Passando para saber se conseguiu analisar o material do Station Park que enviei. Surgiu alguma dúvida? Ah, e tenho uma novidade: uma unidade no 15º andar com vista para o parque acabou de ficar disponível por desistência. É uma oportunidade única! Quer que eu reserve para você conhecer pessoalmente?"
      },
      {
        situacao: "Fechamento",
        script: "Então, revisando: você gostou da unidade 1502, 3 dormitórios no 15º andar com vista para o parque. O valor é R$ 695 mil, com entrada de R$ 69.500 e financiamento do restante em até 360 meses. As parcelas ficam em torno de R$ 4.200. Para garantir esta unidade específica, precisamos do sinal de R$ 5 mil hoje. Posso preparar a reserva?"
      },
      {
        situacao: "Recuperação de lead frio",
        script: "Oi! Há algumas semanas conversamos sobre o Station Park. Sei que às vezes a vida fica corrida e as prioridades mudam. Estou entrando em contato porque tivemos uma redução especial em algumas unidades e lembrei de você. Ainda está considerando a compra de um imóvel? Mesmo que seja para o futuro, posso te atualizar sobre as novas condições."
      }
    ],
    geradoEm: "2026-02-03T00:00:00.000Z"
  },
  "2": {
    argumentosVenda: [
      "Empreendimento PRONTO para morar na Vila Ré - uma das regiões mais tradicionais e valorizadas da zona leste",
      "Lazer completo para toda família: piscina, academia, playground, churrasqueira e salão de festas",
      "Excelente custo-benefício: apartamentos a partir de R$ 200 mil em região consolidada",
      "Condomínio com segurança 24h e portaria - tranquilidade para você e sua família",
      "Fácil acesso às principais vias: Radial Leste e Marginal Tietê a poucos minutos",
      "Comércio completo no entorno: supermercados, escolas, farmácias e hospitais"
    ],
    publicoAlvo: {
      perfis: [
        "Famílias de classe média que buscam primeiro imóvel próprio em bairro tradicional",
        "Casais jovens que querem sair do aluguel com parcelas acessíveis",
        "Moradores da região que querem fazer upgrade de imóvel mantendo-se no bairro",
        "Investidores conservadores buscando imóvel para renda em região consolidada"
      ],
      motivacoes: [
        "Conquistar a casa própria saindo do aluguel",
        "Ter segurança e lazer para os filhos",
        "Morar em bairro tradicional com infraestrutura completa",
        "Investir em imóvel com demanda garantida de locação"
      ]
    },
    objecoes: [
      {
        objecao: "Prefiro bairros mais nobres",
        resposta: "A Vila Ré é um dos bairros mais tradicionais da zona leste, com infraestrutura completa de comércio e serviços. A grande vantagem é o custo-benefício: aqui você tem um apartamento com lazer completo pelo preço de um studio em bairros mais caros. E a qualidade de vida é excelente!"
      },
      {
        objecao: "O apartamento é pequeno para minha família",
        resposta: "Nossos apartamentos têm plantas otimizadas que aproveitam muito bem cada espaço. E lembre-se que todo o lazer do condomínio funciona como extensão do seu apartamento: área de festas para receber, playground para as crianças, churrasqueira para os fins de semana."
      },
      {
        objecao: "Não tenho valor para entrada",
        resposta: "Entendo! Temos condições especiais com entrada facilitada. Você pode usar seu FGTS como parte da entrada e parcelar o restante. Vamos fazer uma simulação para encontrar a melhor forma de viabilizar seu sonho?"
      }
    ],
    comparativo: [
      {
        categoria: "Preço",
        vantagem: "Menor preço por m² da região para empreendimento com lazer completo"
      },
      {
        categoria: "Localização",
        vantagem: "Bairro consolidado com toda infraestrutura de comércio e serviços"
      },
      {
        categoria: "Lazer",
        vantagem: "7 itens de lazer incluindo piscina - raro nesta faixa de preço"
      },
      {
        categoria: "Segurança",
        vantagem: "Portaria 24h e controle de acesso - padrão de condomínio de alto padrão"
      }
    ],
    scripts: [
      {
        situacao: "Primeiro contato",
        script: "Olá! Vi seu interesse no Station Garden na Vila Ré. É um empreendimento pronto para morar, com lazer completo e preços a partir de R$ 200 mil. Uma ótima opção para quem quer sair do aluguel! Você está buscando para morar ou investir?"
      },
      {
        situacao: "Follow-up",
        script: "Oi! Como você está? Lembrei de você porque temos uma condição especial esta semana no Station Garden: entrada parcelada em até 10x. Isso pode ajudar a viabilizar a compra. Quer saber mais detalhes?"
      },
      {
        situacao: "Fechamento",
        script: "Perfeito! A unidade que você escolheu está disponível por R$ 285 mil. Com entrada de R$ 28.500 (pode usar FGTS) e financiamento do restante, as parcelas ficam em torno de R$ 1.800. Posso reservar para você?"
      },
      {
        situacao: "Recuperação de lead frio",
        script: "Olá! Há um tempo conversamos sobre o Station Garden. Estou passando porque temos apenas 15 unidades disponíveis e a procura aumentou muito. Se ainda tiver interesse, posso verificar as melhores opções para você. O que acha?"
      }
    ],
    geradoEm: "2026-02-03T00:00:00.000Z"
  },
  "3": {
    argumentosVenda: [
      "Localização premium no coração da Mooca - bairro tradicional italiano com forte valorização imobiliária",
      "Projeto moderno com rooftop exclusivo - vista panorâmica de São Paulo para momentos especiais",
      "Coworking equipado no condomínio - ideal para o novo modelo de trabalho híbrido",
      "Entrega em Dezembro/2025 - tempo ideal para planejar sua mudança com tranquilidade",
      "Infraestrutura completa: academia, lavanderia, bicicletário e pet place",
      "A 10 minutos do metrô Bresser-Mooca - mobilidade urbana garantida"
    ],
    publicoAlvo: {
      perfis: [
        "Profissionais de tecnologia e startups que valorizam coworking e localização estratégica",
        "Jovens casais sem filhos que buscam bairro descolado com vida noturna e gastronômica",
        "Investidores focados em locação para público jovem e profissional",
        "Pessoas que trabalham home office e precisam de estrutura adequada"
      ],
      motivacoes: [
        "Morar em bairro com identidade cultural forte e vida de bairro",
        "Ter espaço de trabalho profissional sem pagar escritório",
        "Investir em região com histórico consistente de valorização",
        "Aproveitar a vida urbana com restaurantes, bares e cultura"
      ]
    },
    objecoes: [
      {
        objecao: "Ainda está em obras, prefiro pronto",
        resposta: "Entendo a preferência por imóvel pronto, mas comprar na planta tem vantagens únicas: preço até 20% menor que o imóvel pronto, condições de pagamento mais flexíveis durante a obra, e você ainda pode personalizar alguns acabamentos. A entrega é em Dez/2025, tempo suficiente para se organizar."
      },
      {
        objecao: "A Mooca é muito cara",
        resposta: "A Mooca realmente se valorizou muito, e isso é uma vantagem para quem compra agora! O Station Mooca tem um dos melhores preços por m² da região para um empreendimento com este padrão. E a tendência é valorizar ainda mais com os novos empreendimentos e melhorias urbanas."
      },
      {
        objecao: "Não preciso de coworking",
        resposta: "O coworking é um diferencial que agrega valor ao imóvel, mesmo que você não use diariamente. Muitos moradores usam para reuniões ocasionais, ou para ter um ambiente diferente de trabalho. E para locação, é um atrativo enorme para inquilinos jovens!"
      }
    ],
    comparativo: [
      {
        categoria: "Bairro",
        vantagem: "Mooca: tradição italiana + modernidade - um dos bairros mais desejados de SP"
      },
      {
        categoria: "Projeto",
        vantagem: "Rooftop com vista panorâmica - diferencial exclusivo para este padrão de preço"
      },
      {
        categoria: "Trabalho",
        vantagem: "Coworking profissional incluso - economia de até R$ 800/mês em escritório"
      },
      {
        categoria: "Investimento",
        vantagem: "Valorização média de 12% ao ano na Mooca nos últimos 5 anos"
      }
    ],
    scripts: [
      {
        situacao: "Primeiro contato",
        script: "Olá! Vi que você se interessou pelo Station Mooca. É um projeto incrível no coração da Mooca, com rooftop e coworking - perfeito para o estilo de vida atual. Temos apartamentos de 1 a 3 dorms a partir de R$ 250 mil. Você trabalha na região ou está buscando para investir?"
      },
      {
        situacao: "Follow-up",
        script: "Oi! Tudo bem? Passando para compartilhar as fotos atualizadas da obra do Station Mooca - está ficando lindo! A entrega está confirmada para Dez/2025. Que tal agendarmos uma visita ao decorado para você ver de perto a qualidade dos acabamentos?"
      },
      {
        situacao: "Fechamento",
        script: "Então vamos lá: a unidade de 2 dorms no 8º andar, 45m², está por R$ 380 mil. Durante a obra você paga 30% (entrada + mensais) e financia os 70% restantes na entrega das chaves. Isso dá uma parcela de cerca de R$ 2.500 até a entrega. Fechamos?"
      },
      {
        situacao: "Recuperação de lead frio",
        script: "Olá! Lembra que conversamos sobre o Station Mooca? A obra avançou bastante e temos novidades: algumas unidades com desconto para pagamento à vista. Se você ainda pensa em investir na Mooca, essa pode ser uma ótima oportunidade. Posso te contar mais?"
      }
    ],
    geradoEm: "2026-02-03T00:00:00.000Z"
  }
};

export function getPlaybook(empreendimentoId: string | number): PlaybookData | null {
  return playbooks[String(empreendimentoId)] || null;
}
