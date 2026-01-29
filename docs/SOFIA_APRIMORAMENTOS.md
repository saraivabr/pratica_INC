# Plano de Aprimoramento da Sofia

## Visão Geral

Sofia atualmente é uma assistente conversacional com fluxos básicos. Este documento propõe melhorias para transformá-la em uma **especialista completa** do ecossistema Pratica.

---

## 1. NOVOS FLUXOS CONVERSACIONAIS

### 1.1 Consulta de Status de Processos
**Problema:** Corretores não conseguem perguntar "como está a reserva do cliente X?"

**Implementação:**
```typescript
// Novo intent: STATUS_PROCESSO
patterns: [
  /status.*(reserva|proposta|comiss[aã]o|repasse)/i,
  /como.*(est[aá]|anda).*(reserva|proposta|cliente)/i,
  /cadê.*(reserva|comiss[aã]o|pagamento)/i
]

// Novo flow: handleStatusFlow()
// - Busca em cvcrm_leads pelo nome/CPF do cliente
// - Retorna status atual + próximos passos
// - Se tiver pendência, sugere ação
```

### 1.2 Consulta de Comissões
**Problema:** "Quanto tenho a receber?" é uma pergunta frequente sem resposta

**Implementação:**
```typescript
// Novo intent: COMISSAO
patterns: [
  /comiss[aã]o/i,
  /quanto.*(receber|ganhar|faturar)/i,
  /meu.*(saldo|valor|pagamento)/i
]

// Novo flow: handleComissaoFlow()
// - Busca comissões do corretor via API /api/crm/comissoes
// - Mostra: a receber, recebido no mês, próximo pagamento
// - Detalha por venda se solicitado
```

### 1.3 Consulta de Metas e Performance
**Problema:** Corretor não sabe como está em relação às metas

**Implementação:**
```typescript
// Novo intent: METAS
patterns: [
  /meta/i,
  /como.*(estou|tô|to).*(indo|performando)/i,
  /meu.*(desempenho|performance|resultado)/i,
  /ranking/i
]

// Novo flow: handleMetasFlow()
// - Busca via /api/crm/goals e /api/crm/team-metrics
// - Mostra: meta vs realizado, % atingido, posição no ranking
// - Motivação contextual baseada no resultado
```

### 1.4 Agenda e Próximos Compromissos
**Problema:** "O que tenho pra hoje?" não é respondido

**Implementação:**
```typescript
// Novo intent: AGENDA
patterns: [
  /agenda/i,
  /compromisso/i,
  /(o que|oque).*(tenho|tem).*(hoje|amanhã|semana)/i,
  /visita.*(marcada|agendada)/i
]

// Novo flow: handleAgendaFlow()
// - Busca via /api/crm/activities
// - Lista: visitas, ligações, reuniões do dia/semana
// - Permite remarcar ou cancelar via conversa
```

### 1.5 Ajuda com o App
**Problema:** "Como faço pra simular?" gera resposta genérica

**Implementação:**
```typescript
// Novo intent: AJUDA_APP
patterns: [
  /como.*(fa[çc]o|usar|acess[oa]r|encontr[oa]r)/i,
  /onde.*(fica|est[aá]|acho)/i,
  /tutorial/i,
  /ensina/i
]

// Novo flow: handleAjudaAppFlow()
// - Base de conhecimento com passos de cada funcionalidade
// - Screenshots/links para seções específicas
// - Vídeos tutoriais se disponíveis
```

---

## 2. EXPANSÃO DA BASE DE CONHECIMENTO

### 2.1 FAQ Dinâmico
Criar arquivo `lib/sofia/faq.ts` com perguntas frequentes:

```typescript
export const FAQ = {
  // Sobre a Pratica
  empresa: {
    "quem é a pratica": "A Pratica Incorporadora é uma empresa...",
    "diferenciais": "Nossos principais diferenciais são...",
    "empreendimentos ativos": async () => getEmpreendimentosAtivos(),
  },

  // Sobre Processos
  processos: {
    "como funciona reserva": "O processo de reserva tem X etapas...",
    "documentos necessários": "Para reservar, o cliente precisa de...",
    "prazo de aprovação": "A aprovação leva em média X dias...",
    "como funciona comissão": "A comissão é paga em X parcelas...",
  },

  // Sobre o App
  app: {
    "como simular": "Para simular: 1) Acesse Calculadora...",
    "como enviar proposta": "Para enviar proposta: 1) Selecione...",
    "como ver comissão": "Para ver comissões: 1) Acesse Relatórios...",
  },

  // Financeiro
  financeiro: {
    "taxas praticadas": "As taxas atuais são...",
    "entrada mínima": "A entrada mínima é de X%...",
    "prazo máximo": "O prazo máximo de financiamento é...",
  }
}
```

### 2.2 Informações de Empreendimentos
Enriquecer respostas sobre empreendimentos com:

```typescript
// Adicionar em persona.ts -> buildSofiaSystemPrompt
const empreendimentoContext = {
  // Para cada empreendimento ativo:
  nome: "...",
  endereco: "...",
  diferenciais: ["piscina", "academia", "coworking"],
  publicoAlvo: "famílias com filhos",
  argumentosVenda: ["localização privilegiada", "acabamento premium"],
  objecoes: {
    "muito caro": "O valor reflete a qualidade...",
    "longe do centro": "A região está em valorização..."
  },
  comparativosConcorrencia: {...}
}
```

### 2.3 Políticas e Regras de Negócio
Documentar regras que Sofia precisa saber:

```typescript
export const POLITICAS = {
  reserva: {
    valorMinimo: 5000,
    prazoValidade: 7, // dias
    documentosObrigatorios: ["RG", "CPF", "Comprovante de Renda"]
  },
  comissao: {
    percentualPadrao: 4,
    prazoPagemento: "30 dias após assinatura",
    bonificacoes: {...}
  },
  desconto: {
    maximoAutorizado: 5, // %
    aprovacaoGerente: true // acima de 5%
  }
}
```

---

## 3. INTEGRAÇÕES MAIS PROFUNDAS

### 3.1 Consultas em Tempo Real ao CV CRM
Adicionar funções para Sofia consultar diretamente:

```typescript
// lib/sofia/cvcrm-queries.ts

export async function getLeadsByCorretor(corretorId: string) {
  // Retorna leads ativos do corretor
}

export async function getReservaStatus(clienteNome: string) {
  // Busca status da reserva por nome/CPF
}

export async function getComissoesCorretor(corretorId: string) {
  // Retorna comissões pendentes e pagas
}

export async function getProximasAtividades(corretorId: string) {
  // Retorna agenda dos próximos 7 dias
}

export async function getRankingEquipe() {
  // Retorna ranking de performance
}
```

### 3.2 Ações Diretas (não só consultas)
Permitir que Sofia execute ações:

```typescript
// lib/sofia/actions.ts

export async function agendarVisita(leadId: string, data: Date) {
  // Cria atividade de visita
}

export async function enviarMaterial(leadId: string, empreendimento: string) {
  // Gera e envia PDF pelo WhatsApp
}

export async function criarLembrete(corretorId: string, mensagem: string, data: Date) {
  // Cria lembrete na agenda
}

export async function escalarParaGerente(leadId: string, motivo: string) {
  // Notifica gerente sobre lead específico
}
```

### 3.3 Integração com Insights de IA
Usar os insights do Gemini nas respostas:

```typescript
// Em flows.ts, adicionar:
const insights = await fetch('/api/crm/ai-insights').then(r => r.json());

// Incluir no contexto da Sofia:
// - Leads quentes sem contato
// - Melhor horário para ligar
// - Leads com alto potencial de conversão
// - Alertas de leads esfriando
```

---

## 4. MELHORIAS NA PERSONA

### 4.1 Personalização por Perfil
Adaptar tom baseado no usuário:

```typescript
// Em persona.ts
export function getPersonaByUser(user: User) {
  if (user.role === 'admin') {
    return {
      ...basePersona,
      tom: 'executivo',
      detalhe: 'alto', // mais dados e métricas
      sugestoes: true // proativo com recomendações
    }
  }

  if (user.experiencia === 'junior') {
    return {
      ...basePersona,
      tom: 'didático',
      explicacoes: true, // explica termos
      tutoriais: true // oferece ajuda proativa
    }
  }

  return basePersona; // corretor experiente
}
```

### 4.2 Memória de Longo Prazo
Lembrar de preferências e histórico:

```typescript
// Adicionar tabela: user_preferences
{
  user_id: string,
  preferencias: {
    empreendimentosFavoritos: string[],
    faixaPrecoClientes: { min: number, max: number },
    regiaoAtuacao: string[],
    horarioPreferido: string
  },
  historico: {
    ultimosClientesAtendidos: string[],
    taxaConversao: number,
    ticketMedio: number
  }
}

// Sofia usa isso para personalizar:
// "Vi que você tem trabalhado bastante com o Residencial X,
//  tem uma unidade nova que acabou de entrar..."
```

### 4.3 Proatividade Inteligente
Sofia inicia conversas quando relevante:

```typescript
// Triggers para mensagens proativas:
const PROACTIVE_TRIGGERS = {
  // Lead quente sem contato há 24h
  leadEsfriando: {
    condition: (lead) => lead.temperature === 'hot' && lead.lastContact > 24h,
    message: "Ei! O lead {nome} está quente mas sem contato há 24h. Quer que eu sugira uma abordagem?"
  },

  // Meta quase batida
  metaProxima: {
    condition: (user) => user.metaProgress >= 90,
    message: "Você está a {X}% de bater a meta! Faltam só {Y} conversões 💪"
  },

  // Novo empreendimento lançado
  novoLancamento: {
    condition: (empreendimento) => empreendimento.dataLancamento === today,
    message: "Novidade! O {empreendimento} acabou de ser lançado. Quer ver as condições?"
  }
}
```

---

## 5. ANÁLISE DE SENTIMENTO AVANÇADA

### 5.1 Detecção de Contexto Emocional
Expandir análise de sentimento:

```typescript
// Em sentiment.ts, adicionar:
export const EMOTIONAL_CONTEXTS = {
  frustrado_com_sistema: {
    patterns: [/não funciona/, /travou/, /erro/, /bug/],
    response: "offerTechnicalHelp"
  },

  frustrado_com_cliente: {
    patterns: [/cliente chato/, /não responde/, /sumiu/],
    response: "offerSalesCoaching"
  },

  animado_com_venda: {
    patterns: [/fechei/, /vendi/, /consegui/],
    response: "celebrateWithUser"
  },

  desmotivado: {
    patterns: [/difícil/, /não consigo/, /desisto/],
    response: "offerMotivation"
  }
}
```

### 5.2 Respostas Empáticas Contextuais
Adaptar resposta ao estado emocional:

```typescript
// Respostas por contexto emocional:
const EMPATHIC_RESPONSES = {
  frustrado_com_sistema: [
    "Entendo a frustração, vamos resolver isso juntos.",
    "Deixa eu ver o que está acontecendo...",
  ],

  frustrado_com_cliente: [
    "Clientes assim são desafiadores mesmo.",
    "Já passei por isso. Quer uma dica de abordagem?",
  ],

  animado_com_venda: [
    "Parabéns! 🎉 Mais uma conquista!",
    "Arrasou! Conta como foi!",
  ],

  desmotivado: [
    "Dias difíceis fazem parte. Vamos dar a volta por cima?",
    "Ei, você já conquistou muito. Que tal focarmos em um passo de cada vez?",
  ]
}
```

---

## 6. NOVOS INTENTS E ENTIDADES

### 6.1 Novos Intents
Adicionar detecção para:

```typescript
// Em intents.ts
export const NEW_INTENTS = {
  STATUS_PROCESSO: {
    patterns: [
      /status.*(reserva|proposta|venda)/i,
      /como.*(est[aá]|anda)/i,
      /cadê/i
    ]
  },

  COMISSAO: {
    patterns: [
      /comiss[aã]o/i,
      /quanto.*(receber|ganhar)/i,
      /pagamento/i
    ]
  },

  METAS: {
    patterns: [
      /meta/i,
      /ranking/i,
      /desempenho/i,
      /performance/i
    ]
  },

  AGENDA: {
    patterns: [
      /agenda/i,
      /compromisso/i,
      /visita.*marcada/i
    ]
  },

  CAMPANHA: {
    patterns: [
      /promo[çc][aã]o/i,
      /campanha/i,
      /desconto.*especial/i,
      /condi[çc][aã]o.*especial/i
    ]
  },

  CONCORRENCIA: {
    patterns: [
      /concorr[eê]ncia/i,
      /diferencial/i,
      /por.?que.*pratica/i,
      /compara/i
    ]
  },

  OBJECAO: {
    patterns: [
      /muito.*(caro|longe)/i,
      /cliente.*acha/i,
      /como.*(respondo|argumento)/i
    ]
  }
}
```

### 6.2 Novas Entidades
Extrair mais informações das mensagens:

```typescript
// Em intents.ts -> extractEntities
export const NEW_ENTITIES = {
  // Nome de cliente
  nomeCliente: {
    pattern: /cliente\s+([A-Z][a-záéíóú]+(?:\s+[A-Z][a-záéíóú]+)*)/i,
    extract: (match) => match[1]
  },

  // CPF
  cpf: {
    pattern: /(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/,
    extract: (match) => match[1].replace(/\D/g, '')
  },

  // Data
  data: {
    pattern: /(hoje|amanhã|segunda|terça|quarta|quinta|sexta|sábado|domingo|\d{1,2}\/\d{1,2})/i,
    extract: (match) => parseDate(match[1])
  },

  // Horário
  horario: {
    pattern: /(\d{1,2}[h:]\d{0,2}|manhã|tarde|noite)/i,
    extract: (match) => parseTime(match[1])
  },

  // Tipo de unidade
  tipoUnidade: {
    pattern: /(apartamento|casa|sala|loja|terreno|cobertura|studio)/i,
    extract: (match) => match[1].toLowerCase()
  }
}
```

---

## 7. TEMPLATES DE RESPOSTA EXPANDIDOS

### 7.1 Novos Templates
Adicionar em `responses.ts`:

```typescript
export const NEW_TEMPLATES = {
  STATUS: {
    encontrado: "Encontrei! A reserva do {cliente} está em: {status}. {detalhe}",
    naoEncontrado: "Não encontrei nenhuma reserva para {cliente}. Você tem o CPF?",
    multiplos: "Encontrei {n} registros para {cliente}. Qual deles?\n{lista}"
  },

  COMISSAO: {
    resumo: "💰 Suas comissões:\n\n✅ Recebido: R$ {recebido}\n⏳ A receber: R$ {aReceber}\n📅 Próximo: {proximo}",
    detalhe: "Detalhamento:\n{lista}",
    semComissao: "Você não tem comissões pendentes no momento."
  },

  METAS: {
    positivo: "🎯 Você está voando!\n\nMeta: {meta}\nRealizado: {realizado} ({percentual}%)\n\nFaltam só {falta} para bater!",
    atencao: "📊 Seu progresso:\n\nMeta: {meta}\nRealizado: {realizado} ({percentual}%)\n\nVamos acelerar? Tenho algumas dicas...",
    ranking: "🏆 Ranking da equipe:\n{lista}\n\nVocê está em {posicao}º lugar!"
  },

  AGENDA: {
    comCompromissos: "📅 Sua agenda para {periodo}:\n\n{lista}",
    semCompromissos: "Sua agenda está livre para {periodo}. Quer agendar algo?",
    lembrete: "⏰ Lembrete: você tem {atividade} com {cliente} às {horario}."
  },

  CAMPANHA: {
    ativa: "🎉 Temos uma campanha ativa!\n\n{nome}\n{descricao}\n\nCondições: {condicoes}\nVálido até: {validade}",
    semCampanha: "No momento não temos campanhas ativas. Quer que eu avise quando tiver?"
  },

  AJUDA_APP: {
    simulacao: "Para simular financiamento:\n\n1️⃣ Acesse 'Calculadora' no menu\n2️⃣ Selecione o empreendimento\n3️⃣ Escolha a unidade\n4️⃣ Preencha entrada e prazo\n5️⃣ Clique em 'Simular'\n\nQuer que eu faça uma simulação agora?",
    proposta: "Para enviar proposta:\n\n1️⃣ Acesse 'Propostas' no menu\n2️⃣ Clique em '+ Nova Proposta'\n3️⃣ Selecione o lead\n4️⃣ Escolha empreendimento e unidade\n5️⃣ Preencha os dados e envie\n\nPrecisa de ajuda em algum passo?",
    relatorios: "Para ver seus relatórios:\n\n1️⃣ Acesse 'Relatórios' no menu\n2️⃣ Escolha o tipo de relatório\n3️⃣ Selecione o período\n4️⃣ Clique em 'Gerar'\n\nQual relatório você precisa?"
  },

  OBJECAO: {
    caro: "Quando o cliente diz que é caro, você pode:\n\n1. Mostrar o custo-benefício\n2. Comparar com aluguel\n3. Destacar valorização da região\n4. Oferecer condições especiais\n\nQuer um argumento específico para {empreendimento}?",
    longe: "Para objeção de localização:\n\n1. Destaque a infraestrutura do bairro\n2. Mostre a valorização prevista\n3. Compare tempo de deslocamento\n4. Fale sobre qualidade de vida\n\nQuer dados específicos da região?"
  }
}
```

---

## 8. MÉTRICAS E DASHBOARDS

### 8.1 Métricas de Uso da Sofia
Rastrear para melhorias contínuas:

```typescript
// Adicionar tracking:
const SOFIA_METRICS = {
  // Por conversa
  mensagensRecebidas: number,
  mensagensEnviadas: number,
  intentsDetectados: Record<string, number>,
  fluxosCompletados: string[],
  escalacoesFeitas: number,

  // Por usuário
  satisfacao: number, // baseado em feedback
  retencao: number, // volta a usar?
  resolucoesAutonomas: number, // resolveu sem escalar

  // Global
  tempoMedioResposta: number,
  taxaResolucao: number,
  intentsNaoReconhecidos: string[], // para treinar
}
```

### 8.2 Dashboard de Performance da Sofia
Criar página admin para monitorar:

- Quantidade de conversas/dia
- Intents mais comuns
- Taxa de resolução autônoma
- Feedback dos usuários
- Intents não reconhecidos (para treinar)
- Tempo médio de resposta

---

## 9. IMPLEMENTAÇÃO SUGERIDA

### Fase 1: Quick Wins (1-2 semanas)
- [ ] Adicionar intents: STATUS, COMISSAO, METAS, AGENDA
- [ ] Criar templates para novos intents
- [ ] Integrar consulta de comissões
- [ ] Integrar consulta de agenda

### Fase 2: Base de Conhecimento (2-3 semanas)
- [ ] Criar FAQ dinâmico
- [ ] Documentar políticas e regras
- [ ] Adicionar ajuda do app
- [ ] Enriquecer dados de empreendimentos

### Fase 3: Inteligência Avançada (3-4 semanas)
- [ ] Personalização por perfil de usuário
- [ ] Memória de longo prazo
- [ ] Proatividade inteligente
- [ ] Análise de sentimento avançada

### Fase 4: Ações e Automações (4-5 semanas)
- [ ] Permitir ações diretas (agendar, enviar material)
- [ ] Integrar insights de IA
- [ ] Criar triggers proativos
- [ ] Dashboard de métricas da Sofia

---

## 10. ARQUIVOS A CRIAR/MODIFICAR

### Novos Arquivos
```
lib/sofia/faq.ts              # FAQ dinâmico
lib/sofia/knowledge.ts        # Base de conhecimento
lib/sofia/actions.ts          # Ações que Sofia pode executar
lib/sofia/cvcrm-queries.ts    # Consultas específicas ao CV CRM
lib/sofia/proactive.ts        # Triggers de mensagens proativas
lib/sofia/user-memory.ts      # Memória de longo prazo
```

### Arquivos a Modificar
```
lib/sofia/intents.ts          # Adicionar novos intents
lib/sofia/flows.ts            # Adicionar novos handlers
lib/sofia/responses.ts        # Adicionar novos templates
lib/sofia/persona.ts          # Personalização por perfil
lib/sofia/sentiment.ts        # Análise avançada
lib/sofia/context.ts          # Suporte a memória longa
```

### APIs Novas
```
app/api/sofia/metrics/route.ts      # Métricas de uso
app/api/sofia/feedback/route.ts     # Feedback de usuários
app/api/sofia/proactive/route.ts    # Trigger de mensagens proativas
```

---

## Conclusão

Este plano transformará a Sofia de uma assistente básica em uma **especialista completa** que:

1. **Sabe tudo** - FAQ, políticas, empreendimentos, processos
2. **Consulta em tempo real** - status, comissões, metas, agenda
3. **Executa ações** - agenda visitas, envia materiais, cria lembretes
4. **Aprende** - memória de preferências, melhora com feedback
5. **É proativa** - avisa sobre leads esfriando, metas próximas
6. **É empática** - adapta tom ao estado emocional do usuário

O resultado será uma assistente que realmente **ajuda a vender mais**.
