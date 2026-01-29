# Exemplos de Regras de Exibição Dinâmica

Este documento demonstra como as regras de priorização e exibição funcionam com exemplos práticos.

## Exemplo 1: Lead Crítico - João Silva

### Dados do Lead
```json
{
  "id": "1001",
  "nome": "João Silva",
  "telefone": "(11) 99999-8888",
  "email": "joao.silva@email.com",
  "score": 85,
  "valor_negocio": 650000,
  "renda_familiar": 18000,
  "empreendimento": {
    "id": 5,
    "nome": "Residencial Vista Mar"
  },
  "interacoes": [
    {
      "descricao": "Cliente visitou o empreendimento",
      "data_cad": "2026-01-16T14:30:00Z"
    }
  ],
  "data_cadastro": "2026-01-10T10:00:00Z"
}
```

### Cálculo de Urgência (assumindo hoje = 2026-01-22)

**Dias inativo:** 6 dias (desde última interação)

**Pontuação:**
- Dias sem contato (5-7 dias): **25 pontos**
- Score do sistema (85/100): **21 pontos** (85/4)
- Valor do negócio (≥R$500k): **20 pontos**
- Empreendimento de interesse: **15 pontos**
- **TOTAL: 81 pontos**

**Classificação:**
- Prioridade: **CRÍTICA** (≥70 pontos)
- Categoria: **CONTATE AGORA** (6 dias + score alto)
- Ranking: **#1** (maior score)
- Badge: **URGENTE** (vermelho)

**Razões exibidas:**
1. "Momento crítico - contatar hoje"
2. "Lead qualificado (score alto)"
3. "Alto valor (R$ 650k)"
4. "Interesse em Residencial Vista Mar"

**Texto do card:**
```
🔥 CONTATE AGORA
━━━━━━━━━━━━━━━━━━━━━━
#1 [Badge: URGENTE]

João Silva
(11) 99999-8888
🏢 Residencial Vista Mar

⚠️ Momento crítico - contatar hoje
⚠️ Lead qualificado (score alto)

⏱️ 6d inativo  |  📊 Score: 81

[WhatsApp] [Ligar]
```

---

## Exemplo 2: Lead em Risco - Maria Santos

### Dados do Lead
```json
{
  "id": "1002",
  "nome": "Maria Santos",
  "telefone": "(11) 98888-7777",
  "score": 72,
  "valor_negocio": 420000,
  "empreendimento": {
    "id": 3,
    "nome": "Condomínio Jardim Verde"
  },
  "interacoes": [
    {
      "descricao": "Enviou proposta comercial",
      "data_cad": "2026-01-06T09:15:00Z"
    }
  ]
}
```

### Cálculo de Urgência

**Dias inativo:** 16 dias

**Pontuação:**
- Dias sem contato (14-30 dias): **10 pontos**
- Score do sistema (72): **18 pontos**
- Valor do negócio (R$300-499k): **15 pontos**
- Empreendimento de interesse: **15 pontos**
- **TOTAL: 58 pontos**

**Classificação:**
- Prioridade: **ALTA** (50-69 pontos)
- Categoria: **RISCO DE PERDA** (≥14 dias + score > 20)
- Ranking: **#2**
- Badge: **ALTA** (laranja)

**Razões exibidas:**
1. "⚠️ RISCO: Lead valioso esfriando"
2. "Lead esfriando (16d sem contato)"

**Texto do card:**
```
⚠️ RISCOS DE PERDA
━━━━━━━━━━━━━━━━━━━━━━
#2 [Badge: ALTA]

Maria Santos
(11) 98888-7777
🏢 Condomínio Jardim Verde

⚠️ RISCO: Lead valioso esfriando
⚠️ Lead esfriando (16d sem contato)

⏱️ 16d inativo  |  📊 Score: 58

[WhatsApp] [Ligar]
```

---

## Exemplo 3: Oportunidade Quente - Carlos Oliveira

### Dados do Lead
```json
{
  "id": "1003",
  "nome": "Carlos Oliveira",
  "telefone": "(11) 97777-6666",
  "score": 92,
  "valor_negocio": 580000,
  "empreendimento": {
    "id": 8,
    "nome": "Edifício Horizonte"
  },
  "interacoes": [
    {
      "descricao": "Cliente pediu simulação financeira",
      "data_cad": "2026-01-21T16:45:00Z"
    }
  ]
}
```

### Cálculo de Urgência

**Dias inativo:** 1 dia

**Pontuação:**
- Dias sem contato (0-2 dias): **35 pontos**
- Score do sistema (92): **23 pontos**
- Valor do negócio (≥R$500k): **20 pontos**
- Empreendimento de interesse: **15 pontos**
- **TOTAL: 93 pontos**

**Classificação:**
- Prioridade: **CRÍTICA** (≥70 pontos)
- Categoria: **OPORTUNIDADE HOJE** (≤3 dias + score ≥ 60)
- Ranking: **#1**
- Badge: **URGENTE** (vermelho, mas contexto positivo)

**Razões exibidas:**
1. "🔥 QUENTE: Alta chance de conversão"
2. "Contato recente (1d)"
3. "Lead qualificado (score alto)"

**Texto do card:**
```
💰 OPORTUNIDADES HOJE
━━━━━━━━━━━━━━━━━━━━━━
#1 [Badge: URGENTE]

Carlos Oliveira
(11) 97777-6666
🏢 Edifício Horizonte

⚠️ 🔥 QUENTE: Alta chance de conversão
⚠️ Contato recente (1d)

⏱️ 1d inativo  |  📊 Score: 93

[WhatsApp] [Ligar]
```

---

## Exemplo 4: Ação Atrasada - Ana Paula

### Dados do Lead
```json
{
  "id": "1004",
  "nome": "Ana Paula",
  "telefone": "(11) 96666-5555",
  "score": 65,
  "valor_negocio": 280000,
  "interacoes": [
    {
      "descricao": "Cliente solicitou mais informações",
      "data_cad": "2026-01-13T11:20:00Z"
    }
  ]
}
```

### Cálculo de Urgência

**Dias inativo:** 9 dias

**Pontuação:**
- Dias sem contato (7-14 dias): **15 pontos**
- Score do sistema (65): **16 pontos**
- Valor do negócio (R$150-299k): **10 pontos**
- Sem empreendimento: **0 pontos**
- **TOTAL: 41 pontos**

**Classificação:**
- Prioridade: **MÉDIA** (30-49 pontos)
- Categoria: **AÇÃO ATRASADA** (7-14 dias)
- Ranking: **#3**
- Badge: **MÉDIA** (azul)

**Razões exibidas:**
1. "Ação atrasada - retomar contato"
2. "Aguardando follow-up (9d)"

**Texto do card:**
```
⏰ AÇÕES ATRASADAS
━━━━━━━━━━━━━━━━━━━━━━
#3 [Badge: MÉDIA]

Ana Paula
(11) 96666-5555

⚠️ Ação atrasada - retomar contato
⚠️ Aguardando follow-up (9d)

⏱️ 9d inativo  |  📊 Score: 41

[WhatsApp] [Ligar]
```

---

## Regras de Preenchimento de Seções

### Cenário 1: Muitos Leads Urgentes

**Entrada:**
- 8 leads com score ≥ 70 (críticos)
- 5 em "Contate Agora"
- 3 em "Riscos de Perda"

**Saída:**
```
🔥 CONTATE AGORA: 5 leads (máximo)
⚠️ RISCOS DE PERDA: 3 leads
💰 OPORTUNIDADES: 0 leads
⏰ ATRASADOS: 0 leads
```

### Cenário 2: Poucos Leads Urgentes

**Entrada:**
- 2 leads em "Contate Agora"
- 1 lead em "Riscos de Perda"
- 4 leads de prioridade alta/crítica sem categoria

**Saída:**
```
🔥 CONTATE AGORA: 5 leads (2 originais + 3 de alta prioridade)
⚠️ RISCOS DE PERDA: 1 lead
💰 OPORTUNIDADES: 0 leads
⏰ ATRASADOS: 0 leads
```

Sistema preenche "Contate Agora" com leads de alta prioridade para garantir visibilidade.

### Cenário 3: Dashboard Limpo

**Entrada:**
- 0 leads em todas as categorias urgentes
- Todos os leads estão atualizados ou convertidos

**Saída:**
```
🔥 CONTATE AGORA
🎉 Ótimo! Nenhuma ação crítica pendente no momento.

⚠️ RISCOS DE PERDA
✅ Sem leads em risco. Continue mantendo o ritmo!

💰 OPORTUNIDADES HOJE
Continue prospectando para encontrar mais oportunidades.

⏰ AÇÕES ATRASADAS
🎯 Perfeito! Todas as ações estão em dia.
```

---

## Banner de Resumo IA - Exemplos

### Cenário A: Alta Urgência
```
📊 Resumo de Urgência - Responda em 5 segundos

❓ Quem contatar agora?
→ 5 lead(s) precisam de contato URGENTE - veja "Contate Agora"

❓ O que estou prestes a perder?
→ 3 lead(s) valioso(s) esfriando - veja "Riscos de Perda"

❓ O que pode virar venda hoje?
→ 2 oportunidade(s) quente(s) - veja "Oportunidades Hoje"
```

### Cenário B: Situação Controlada
```
📊 Resumo de Urgência - Responda em 5 segundos

❓ Quem contatar agora?
→ Nenhuma ação crítica no momento ✓

❓ O que estou prestes a perder?
→ 1 lead(s) valioso(s) esfriando - veja "Riscos de Perda"

❓ O que pode virar venda hoje?
→ 4 oportunidade(s) quente(s) - veja "Oportunidades Hoje"
```

### Cenário C: Tudo em Ordem
*(Banner não aparece - sem itens urgentes)*

---

## Métricas de Header

### Exemplo com Alta Atividade
```
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│  Contatar Agora     │ │  Risco de Perda     │ │  Oportunidades      │ │  Atrasados          │
│  🔥 5               │ │  ⚠️ 3               │ │  💰 2               │ │  ⏰ 4               │
│  Ações críticas     │ │  Leads esfriando    │ │  Quentes hoje       │ │  Follow-ups         │
│  (glow vermelho)    │ │  (glow laranja)     │ │  (glow verde)       │ │  (glow roxo)        │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

### Exemplo com Baixa Atividade
```
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│  Contatar Agora     │ │  Risco de Perda     │ │  Oportunidades      │ │  Atrasados          │
│  🔥 0               │ │  ⚠️ 1               │ │  💰 3               │ │  ⏰ 0               │
│  Ações críticas     │ │  Leads esfriando    │ │  Quentes hoje       │ │  Follow-ups         │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

---

## Interações com Botões

### Clicar em "WhatsApp" para João Silva

**Ação:**
1. Extrai telefone: `(11) 99999-8888` → `5511999998888`
2. Monta mensagem personalizada:
   ```
   Olá João! Como vai? Gostaria de conversar sobre Residencial Vista Mar.
   ```
3. Abre URL:
   ```
   https://wa.me/5511999998888?text=Ol%C3%A1%20Jo%C3%A3o%21%20Como%20vai%3F%20Gostaria%20de%20conversar%20sobre%20Residencial%20Vista%20Mar.
   ```

### Clicar em "Ligar" para Maria Santos

**Ação:**
1. Extrai telefone: `(11) 98888-7777` → `5511988887777`
2. Inicia chamada:
   ```
   tel:+5511988887777
   ```

---

## Performance em 5 Segundos

### Timeline Esperada

```
0.0s → Usuário acessa /corretor
0.1s → React renderiza skeleton/loading
0.8s → API retorna leads (fetch /api/leads?limit=100)
1.0s → Início do cálculo de urgência (client-side)
1.2s → Categorização completa (100 leads processados)
1.3s → Primeira renderização do Banner de Resumo
1.5s → Renderização das 4 seções principais
1.8s → Animações e efeitos visuais carregados
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
< 2.0s → DASHBOARD COMPLETO E INTERATIVO
```

**Total:** Menos de 2 segundos para responder às 3 perguntas críticas ✓

---

## Conclusão

As regras de exibição dinâmica garantem que:
- ✅ Leads mais urgentes sempre aparecem primeiro
- ✅ Categorias são preenchidas com inteligência
- ✅ Visual comunica prioridade de forma clara
- ✅ Ações são acessíveis com 1 clique
- ✅ Performance atende o requisito de 5 segundos
