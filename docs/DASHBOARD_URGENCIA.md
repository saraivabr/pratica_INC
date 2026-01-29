# Dashboard de Urgência - Documentação

## Visão Geral

O dashboard foi reestruturado para priorizar **ações urgentes** e **oportunidades críticas**, respondendo às 3 perguntas essenciais em menos de 5 segundos:

1. **Quem eu preciso contatar agora?**
2. **O que estou prestes a perder?**
3. **O que mais pode virar venda hoje?**

---

## Blocos Obrigatórios

### 1. 🔥 CONTATE AGORA (Contact Now)
**Objetivo:** Identificar leads que precisam de atenção **imediata**.

**Critérios de inclusão:**
- Leads com 5-7 dias sem contato + score ≥ 40
- Leads com alto potencial (score ≥ 70)
- Leads em momento crítico de decisão

**Limite:** Top 5 leads mais urgentes

**Ações disponíveis:**
- Botão WhatsApp (abre conversa com mensagem pré-formatada)
- Botão Ligar (inicia chamada telefônica)

---

### 2. ⚠️ RISCOS DE PERDA (Loss Risks)
**Objetivo:** Recuperar leads valiosos que estão esfriando.

**Critérios de inclusão:**
- Leads com ≥14 dias sem contato + score > 20
- Leads com alto valor de negócio esfriando
- Leads qualificados sem acompanhamento

**Limite:** Top 5 leads em risco

**Ações disponíveis:**
- Botão "Recuperar lead" via WhatsApp
- Botão Ligar

---

### 3. 💰 OPORTUNIDADES HOJE (Today's Opportunities)
**Objetivo:** Identificar leads quentes prontos para conversão.

**Critérios de inclusão:**
- Leads com ≤3 dias de contato + score ≥ 60
- Alta qualificação + interesse recente
- Momentum positivo de vendas

**Limite:** Top 5 oportunidades

**Ações disponíveis:**
- Botão "Fechar venda" via WhatsApp
- Botão Ligar

---

### 4. ⏰ AÇÕES ATRASADAS (Overdue Actions)
**Objetivo:** Recuperar follow-ups pendentes.

**Critérios de inclusão:**
- Leads com 7-14 dias sem contato
- Follow-ups que deveriam ter sido realizados
- Retomada de conversas paralisadas

**Limite:** Top 5 ações atrasadas

**Ações disponíveis:**
- Botão "Retomar contato" via WhatsApp
- Botão Ligar

---

## Métricas de Header

### Métricas Urgentes (substituindo métricas antigas)

1. **Contatar Agora** (vermelho 🔴)
   - Count de ações críticas
   - Destaque visual: glow vermelho

2. **Risco de Perda** (laranja 🟠)
   - Count de leads esfriando
   - Destaque visual: glow laranja

3. **Oportunidades** (verde 🟢)
   - Count de leads quentes
   - Destaque visual: glow verde
   - Trend: +15% (exemplo)

4. **Atrasados** (roxo 🟣)
   - Count de follow-ups pendentes
   - Destaque visual: glow roxo

---

## Sistema de Alertas

### Banner de Resumo IA (topo)
Responde às 3 perguntas críticas em formato direto:

```
📊 Resumo de Urgência - Responda em 5 segundos

❓ Quem contatar agora?
→ {X} lead(s) precisam de contato URGENTE - veja "Contate Agora"

❓ O que estou prestes a perder?
→ {Y} lead(s) valioso(s) esfriando - veja "Riscos de Perda"

❓ O que pode virar venda hoje?
→ {Z} oportunidade(s) quente(s) - veja "Oportunidades Hoje"
```

**Regras de exibição:**
- Só aparece se houver pelo menos 1 item em qualquer categoria
- Cores por pergunta: vermelho, laranja, verde
- Links diretos para as seções

---

## Priorização de Leads

### Algoritmo de Urgência (0-100 pontos)

**Fator 1: Dias sem contato** (0-40 pontos)
- 0-2 dias: 35 pontos (manter momentum)
- 3-5 dias: 30 pontos (follow-up necessário)
- 5-7 dias: 25 pontos (prestes a esfriar)
- 7-14 dias: 15 pontos (esfriando)
- 14-30 dias: 10 pontos (frio)
- 30+ dias: 5 pontos (muito frio)

**Fator 2: Score do sistema** (0-25 pontos)
- Score alto (≥80): lead qualificado, +20-25 pontos
- Score médio (50-79): +10-19 pontos
- Score baixo (<50): +0-9 pontos

**Fator 3: Valor do negócio** (0-20 pontos)
- ≥R$500k: 20 pontos
- R$300k-499k: 15 pontos
- R$150k-299k: 10 pontos
- <R$150k: 0-5 pontos

**Fator 4: Interesse específico** (0-15 pontos)
- Tem empreendimento de interesse: +15 pontos
- Sem empreendimento específico: 0 pontos

### Níveis de Prioridade

```
70-100 pontos → CRÍTICA (vermelho)
50-69 pontos  → ALTA (laranja)
30-49 pontos  → MÉDIA (azul)
0-29 pontos   → BAIXA (cinza)
```

---

## Regras de Exibição Dinâmica

### 1. Preenchimento de Seções

**Regra geral:** Cada seção mostra até 5 leads.

**Se "Contate Agora" < 3 leads:**
- Sistema busca leads de **prioridade alta/crítica** de outras categorias
- Garante que a seção mais importante sempre tem conteúdo

**Se todas as seções vazias:**
- Mostrar mensagens positivas de reforço:
  - "🎉 Ótimo! Nenhuma ação crítica pendente."
  - "✅ Sem leads em risco. Continue mantendo o ritmo!"
  - "🎯 Perfeito! Todas as ações estão em dia."

### 2. Badges de Prioridade

Cada lead mostra um badge de prioridade:
- **URGENTE** (crítica) - vermelho
- **ALTA** - laranja
- **MÉDIA** - azul
- **BAIXA** - cinza

### 3. Ranking Visual

Cada card de lead mostra:
- **Número do ranking** (1-5) no canto superior esquerdo
- **Score de urgência** na parte inferior
- **Dias inativo** como métrica de tempo
- **Razões de urgência** (top 2) em destaque

### 4. Efeitos Visuais

**Glow effects por prioridade:**
- Crítica: glow vermelho pulsante
- Alta: glow laranja
- Média: glow azul
- Baixa: glow cinza suave

**Hover effects:**
- Aumento do glow
- Elevação do card
- Destaque nos botões de ação

---

## Exemplos de Texto

### Razões de Urgência (exibidas nos cards)

**Contato recente:**
- "Contato recente (2d)"
- "Aguardando follow-up (4d)"

**Lead esfriando:**
- "Prestes a esfriar (6d sem contato)"
- "Lead esfriando (12d sem contato)"
- "Lead frio (25d sem contato)"

**Qualificação:**
- "Lead qualificado (score alto)"
- "Alto valor (R$ 450k)"
- "Valor médio-alto"

**Interesse:**
- "Interesse em [Nome do Empreendimento]"

**Avisos críticos:**
- "⚠️ RISCO: Lead valioso esfriando"
- "Momento crítico - contatar hoje"
- "🔥 QUENTE: Alta chance de conversão"
- "Ação atrasada - retomar contato"

### Mensagens WhatsApp (pré-formatadas)

Ao clicar em "WhatsApp", abre com mensagem:
```
Olá [Nome]! Como vai? Gostaria de conversar sobre [Empreendimento/as oportunidades disponíveis].
```

---

## Performance: Resposta em 5 Segundos

### Otimizações Implementadas

1. **Cálculo no Cliente:**
   - Algoritmo de urgência roda no front-end
   - Sem latência de API adicional

2. **Memoização:**
   - `useMemo` para categorização de leads
   - Recalcula apenas quando leads mudam

3. **Limite de Dados:**
   - API busca apenas primeiros 100 leads
   - Top 5 por categoria

4. **Renderização Condicional:**
   - Seções vazias não renderizam cards
   - Loading state único

### Métricas Esperadas

- **Carregamento inicial:** <2s
- **Categorização:** <500ms
- **Renderização:** <1s
- **Interação:** instantânea

---

## Estrutura de Arquivos

```
/lib/urgency-calculator.ts
  └─ Lógica de cálculo de urgência
  └─ Categorização de leads
  └─ Estatísticas de urgência

/components/dashboard/urgent-lead-card.tsx
  └─ Card individual de lead urgente
  └─ Botões de ação (WhatsApp, Call)
  └─ Visual de prioridade

/components/dashboard/dashboard-section-wrapper.tsx
  └─ Container para seções do dashboard
  └─ Header com ícone e contadores
  └─ Estados vazios com mensagens

/app/corretor/page.tsx
  └─ Dashboard principal reestruturado
  └─ Integração com urgency-calculator
  └─ Renderização de todas as seções
```

---

## Próximos Passos

### Otimizações Futuras

1. **Cache de leads:** Reduzir chamadas API com cache local
2. **Filtros dinâmicos:** Permitir filtrar por empreendimento/origem
3. **Notificações:** Alertas quando lead entra em risco crítico
4. **Histórico:** Tracking de ações realizadas do dashboard
5. **Relatórios:** Analytics de conversão por categoria de urgência

### Integrações Possíveis

1. **WhatsApp API real:** Envio automático via API
2. **Calendário:** Agendamento direto do dashboard
3. **CRM:** Sincronização bidirecional
4. **Analytics:** Métricas de engajamento e conversão

---

## Conclusão

O dashboard reestruturado força a priorização através de:
- ✅ **Visualização clara** do que é urgente vs. importante
- ✅ **Ações imediatas** com 1 clique (WhatsApp/Call)
- ✅ **Respostas rápidas** às 3 perguntas críticas (<5s)
- ✅ **Alertas visuais** que chamam atenção para riscos
- ✅ **Ranking automático** baseado em múltiplos fatores
