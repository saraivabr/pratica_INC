# Sistema de Score Automático de Leads

## 📊 Visão Geral

O sistema de score automático de leads foi desenvolvido para ajudar corretores de imóveis a:
- **Priorizar atendimentos** - Identificar quais leads atacar primeiro
- **Reduzir leads esquecidos** - Detectar leads em risco de perda
- **Aumentar taxa de fechamento** - Focar nos leads mais promissores

## 🎯 Critérios de Pontuação

O score final (0-100 pontos) é calculado baseado em 5 fatores principais:

### 1. Tempo sem Resposta (25 pontos - 25%)

Avalia a urgência baseada no tempo desde a última interação:

| Dias | Pontos | Observação |
|------|--------|------------|
| 0 (hoje) | 25 | Lead muito ativo |
| 1 | 23 | Contato recente |
| 2-3 | 19-21 | Ainda fresco |
| 4-5 | 16 | Começando a esfriar |
| 6-7 | 12 | Atenção necessária |
| 8-10 | 8 | Risco moderado |
| 11-14 | 5 | Alto risco |
| 15-21 | 2 | Muito arriscado |
| 21+ | 0 | Crítico |

**Objetivo**: Quanto mais recente a interação, maior a prioridade.

### 2. Interação Recente (25 pontos - 25%)

Mede o engajamento e atividade recente do lead (últimos 7 dias):

- **Base**: 3 pontos por interação recente (máx. 15 pontos)
- **Bônus de qualidade** (+7 pontos):
  - Reunião agendada
  - Proposta enviada
  - Visita realizada
  - Venda iniciada
- **Bônus de frequência** (+3 pontos): 3 ou mais interações em 7 dias
- **Sem interações recentes**: 5 pontos (tem histórico)
- **Sem histórico**: 0 pontos

**Objetivo**: Leads ativos e engajados têm maior prioridade.

### 3. Tipo de Imóvel (20 pontos - 20%)

Considera o valor e tipo do imóvel de interesse:

**Base**: 10 pontos por ter empreendimento definido

**Bônus por tipo**:
- Cobertura: +5 pontos
- Apartamento: +3 pontos
- Casa: +2 pontos
- Terreno: +1 ponto

**Bônus por valor**:
- > R$ 500.000: +5 pontos
- R$ 300.000 - R$ 500.000: +3 pontos
- R$ 150.000 - R$ 300.000: +2 pontos

**Objetivo**: Imóveis de maior valor ou tipo premium têm prioridade.

### 4. Ações do Cliente (20 pontos - 20%)

Avalia a diversidade e qualidade das interações:

- **Base**: 2 pontos por interação (máx. 10 pontos)

**Bônus por tipo de ação**:
- Visita: +4 pontos
- Proposta: +3 pontos
- Reunião: +3 pontos
- Ligação: +2 pontos
- WhatsApp: +2 pontos
- Email: +1 ponto

**Objetivo**: Leads com ações diversificadas demonstram maior interesse.

### 5. Histórico do Corretor (10 pontos - 10%)

Considera o engajamento do corretor com o lead:

- **Base**: 5 pontos (média)
- **Tem corretor atribuído**: +2 pontos
- **5+ interações**: +2 pontos
- **10+ interações**: +1 ponto adicional

**Objetivo**: Leads bem acompanhados têm melhor chance de conversão.

## 🌡️ Classificação por Temperatura

O score total determina a temperatura do lead:

### 🔥 Quente (76-100 pontos)
- **Prioridade**: Máxima (8-10)
- **Ação**: Atacar imediatamente
- **Descrição**: Lead muito ativo, em momento ideal para fechar negócio
- **Cor**: Verde (emerald)
- **Exemplo**: Lead com múltiplas interações recentes, imóvel de alto valor, engajamento constante

### 🌤️ Morno (51-75 pontos)
- **Prioridade**: Média (5-7)
- **Ação**: Acompanhar de perto
- **Descrição**: Lead em desenvolvimento, necessita nutrição
- **Cor**: Amarelo/Laranja (amber)
- **Exemplo**: Lead com algumas interações, interesse demonstrado mas sem urgência

### ❄️ Frio (31-50 pontos)
- **Prioridade**: Baixa (1-4)
- **Ação**: Manter no radar
- **Descrição**: Lead com baixo engajamento, avaliar investimento de tempo
- **Cor**: Cinza (slate)
- **Exemplo**: Lead antigo, poucas interações, sem atividade recente

### ⚠️ Risco (0-30 pontos)
- **Prioridade**: Urgente (10)
- **Ação**: Recuperar imediatamente
- **Descrição**: Lead em risco de perda, necessita ação urgente
- **Cor**: Vermelho (red)
- **Exemplo**: Lead parado há mais de 14 dias, sem resposta, risco de esquecer

## 📋 Categorias de Ação

Além da temperatura, o sistema recomenda uma categoria de ação específica:

### 🎯 Atacar Agora
- Leads quentes com múltiplas interações recentes
- Leads novos com alto potencial
- Momento ideal para fechamento

### 👁️ Acompanhar
- Leads mornos em desenvolvimento
- Engajamento moderado em progresso
- Manter contato regular

### 🔄 Recuperar
- Leads em risco de perda
- Sem interação há mais de 14 dias
- Ação urgente de recuperação

### 💬 Manter Contato
- Leads começando a esfriar
- Reforçar interesse antes que esfrie
- Prevenção de perda

### 📊 Revisar
- Leads frios com baixo potencial
- Avaliar se vale investir tempo
- Considerar realocar recursos

## 🎨 Exemplos Práticos

### Exemplo 1: Lead Quente (Score: 85)

**Perfil**:
- Nome: João Silva
- Última interação: Hoje (10h)
- Interações na semana: 4 (WhatsApp, ligação, email, reunião)
- Imóvel: Apartamento de R$ 450.000
- Corretor atribuído: Sim

**Breakdown do Score**:
- Tempo sem resposta: 25/25 (interação hoje)
- Interação recente: 24/25 (4 interações + reunião)
- Tipo de imóvel: 16/20 (apartamento + valor médio-alto)
- Ações do cliente: 14/20 (diversidade de canais)
- Histórico corretor: 6/10 (corretor engajado)

**Resultado**:
- 🔥 **Temperatura**: Quente
- **Prioridade**: 9/10
- **Ação**: Atacar agora
- **Mensagem**: "Lead muito ativo! Momento ideal para fechar negócio ou agendar visita."

### Exemplo 2: Lead em Risco (Score: 22)

**Perfil**:
- Nome: Maria Santos
- Última interação: 18 dias atrás
- Interações totais: 2 (cadastro inicial + 1 ligação)
- Imóvel: Casa de R$ 280.000
- Corretor: Não atribuído

**Breakdown do Score**:
- Tempo sem resposta: 0/25 (18 dias sem contato)
- Interação recente: 5/25 (tem histórico mas não recente)
- Tipo de imóvel: 12/20 (casa + valor médio)
- Ações do cliente: 4/20 (poucas interações)
- Histórico corretor: 1/10 (sem corretor)

**Resultado**:
- ⚠️ **Temperatura**: Risco
- **Prioridade**: 10/10 (urgente)
- **Ação**: Recuperar
- **Mensagem**: "Lead em risco de perda. Contato urgente necessário para reativar o interesse."

### Exemplo 3: Lead Morno (Score: 62)

**Perfil**:
- Nome: Carlos Oliveira
- Última interação: 5 dias atrás
- Interações no mês: 6 (mix de canais)
- Imóvel: Apartamento de R$ 320.000
- Corretor atribuído: Sim

**Breakdown do Score**:
- Tempo sem resposta: 16/25 (5 dias)
- Interação recente: 15/25 (bom histórico)
- Tipo de imóvel: 15/20 (apartamento + valor médio)
- Ações do cliente: 12/20 (boa diversidade)
- Histórico corretor: 4/10 (engajamento ok)

**Resultado**:
- 🌤️ **Temperatura**: Morno
- **Prioridade**: 6/10
- **Ação**: Acompanhar
- **Mensagem**: "Lead em andamento. Manter acompanhamento regular e nutrir relacionamento."

## 🔧 Como Usar no Sistema

### Na Interface de Leads

1. **Badge de Temperatura**: Cada lead exibe um badge colorido indicando sua temperatura
2. **Score Numérico**: Score de 0-100 visível ao lado da temperatura
3. **Ordenação Automática**: Leads ordenados por prioridade (Risco > Quente > Morno > Frio)
4. **Filtros**: Filtrar leads por temperatura específica

### Detalhes do Lead

1. **Card de Score**: Visualização completa com gauge circular
2. **Breakdown**: Gráficos mostrando contribuição de cada fator
3. **Recomendação**: Mensagem específica de ação recomendada
4. **Histórico**: Evolução do score ao longo do tempo (futuro)

### Dashboard

1. **Estatísticas**: Distribuição de leads por temperatura
2. **Top 10**: Leads prioritários do dia
3. **Alertas**: Notificações de leads em risco

## 📈 Benefícios Esperados

### Para o Corretor
- ✅ Clareza sobre quais leads priorizar
- ✅ Redução de tempo perdido com leads frios
- ✅ Identificação rápida de oportunidades
- ✅ Prevenção de perda de leads esquecidos

### Para a Imobiliária
- ✅ Aumento na taxa de conversão
- ✅ Melhor aproveitamento do tempo da equipe
- ✅ Redução de leads perdidos
- ✅ Dados para otimização de processos

### Métricas de Sucesso
- **Taxa de conversão**: Aumento esperado de 15-25%
- **Leads esquecidos**: Redução esperada de 40-60%
- **Tempo de resposta**: Redução esperada de 30-50%
- **Satisfação do cliente**: Melhoria no acompanhamento

## 🔮 Melhorias Futuras

1. **Machine Learning**: Ajustar pesos baseado em histórico de conversões
2. **Personalização**: Permitir corretor ajustar critérios por tipo de imóvel
3. **Predição**: Prever probabilidade de fechamento
4. **Integração**: Sugerir melhores horários de contato
5. **Automação**: Disparar ações automáticas (emails, WhatsApp) baseado no score

## 💡 Dicas de Uso

1. **Revisar diariamente**: Verificar leads em risco todo dia de manhã
2. **Agir em leads quentes**: Não deixar leads quentes esperando
3. **Nutrir leads mornos**: Manter contato regular para esquentar
4. **Avaliar leads frios**: Decidir se vale continuar investindo
5. **Usar filtros**: Focar em uma temperatura por vez
6. **Acompanhar evolução**: Ver como score muda ao longo do tempo

---

**Desenvolvido para maximizar conversões e reduzir leads esquecidos** 🚀
