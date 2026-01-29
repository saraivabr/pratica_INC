# Visualização do Sistema de Score de Leads

## 📱 Interface Visual

### 1. Badge de Temperatura do Lead

O badge aparece em cada card de lead mostrando a temperatura e score:

```
🔥 Quente 85         ← Lead prioritário (score alto)
🌤️ Morno 62          ← Lead em desenvolvimento
❄️ Frio 42           ← Lead com baixa prioridade
⚠️ Risco 22          ← Lead em risco de perda
```

#### Características Visuais:
- **Quente (76-100)**: Verde (emerald) - fundo claro, borda verde, ícone de chama
- **Morno (51-75)**: Amarelo/Laranja (amber) - fundo claro, borda amarela, ícone de termômetro
- **Frio (31-50)**: Cinza (slate) - fundo claro, borda cinza, ícone de floco de neve
- **Risco (0-30)**: Vermelho (red) - fundo claro, borda vermelha, ícone de alerta

### 2. Card de Lead com Score

Cada lead na página de leads exibe:

```
┌─────────────────────────────────────────────────────┐
│ ═══ (barra colorida no topo baseada na temperatura) │
│                                                       │
│  👤  João Silva               🔥 Quente 85           │
│      (11) 99999-9999                                 │
│                                                       │
│  🏢  Interesse: Apartamento Premium Villa           │
│  💬  "Cliente interessado em agendar visita..."     │
│  ⏰  Sem interação há 0 dia(s)                      │
│  📈  Lead muito ativo! Momento ideal para fechar... │
│                                                       │
│  [Simular]  [Enviar ➜]                              │
└─────────────────────────────────────────────────────┘
```

### 3. Card Detalhado de Score (LeadScoreCard)

Quando aberto o detalhamento do lead:

```
┌─────────────────────────────────────────────────────┐
│ ═══════════════════════════ (gradiente verde)      │
│                                                       │
│  🔥 Quente 85           Score: ◉◉◉◉◉◉◉◉◯◯           │
│                         ╱       85      ╲            │
│  Lead muito ativo!     │      de 100     │          │
│  Momento ideal para    ╲               ╱            │
│  fechar negócio.                                     │
│                                                       │
│  🎯 Prioridade: 9/10                                │
│  ⏰ Calculado: 14:32                                │
│                                                       │
│  ────────────────────────────────────                │
│                                                       │
│  📊 Breakdown do Score                               │
│                                                       │
│  ⏰ Tempo sem Resposta        25/25  ▓▓▓▓▓▓▓▓▓▓    │
│  💬 Interação Recente         24/25  ▓▓▓▓▓▓▓▓▓▓    │
│  🏢 Tipo de Imóvel            16/20  ▓▓▓▓▓▓▓▓░░    │
│  🎬 Ações do Cliente          14/20  ▓▓▓▓▓▓▓░░░    │
│  📈 Histórico Corretor         6/10  ▓▓▓▓▓▓░░░░    │
│                                                       │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│  │  ⏰  │ │  💬  │ │  🏢  │ │  🎬  │ │  📈  │     │
│  │  25  │ │  24  │ │  16  │ │  14  │ │   6  │     │
│  │de 25 │ │de 25 │ │de 20 │ │de 20 │ │de 10 │     │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘     │
└─────────────────────────────────────────────────────┘
```

### 4. Página de Leads com Ordenação

A página de leads organiza automaticamente os leads por prioridade:

```
┌─────────────────────────────────────────────────────────────┐
│  🔄 Painel de Leads                    🌟 Recuperação IA    │
│  Ações rápidas e simulação de recuperação de leads          │
│                                                               │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                      │
│  │ 142  │ │  89  │ │  38  │ │  15  │                      │
│  │Total │ │Ativos│ │Irreg.│ │Perd. │                      │
│  └──────┘ └──────┘ └──────┘ └──────┘                      │
│                                                               │
│  [Filtrar] [Atualizar]                                       │
│                                                               │
├─────────────┬──────────────┬─────────────┐                 │
│  ⚠️ RISCO   │  🔥 QUENTE   │  🌤️ MORNO   │                 │
│  15 leads   │  28 leads    │  46 leads    │                 │
├─────────────┼──────────────┼──────────────┤                 │
│             │              │              │                 │
│ (Lead 1)    │ (Lead 1)     │ (Lead 1)     │                 │
│ Score: 22   │ Score: 89    │ Score: 68    │                 │
│ Prio: 10    │ Prio: 9      │ Prio: 7      │                 │
│             │              │              │                 │
│ (Lead 2)    │ (Lead 2)     │ (Lead 2)     │                 │
│ Score: 18   │ Score: 85    │ Score: 62    │                 │
│ Prio: 10    │ Prio: 9      │ Prio: 6      │                 │
│             │              │              │                 │
│ (Lead 3)    │ (Lead 3)     │ (Lead 3)     │                 │
│ ...         │ ...          │ ...          │                 │
└─────────────┴──────────────┴──────────────┘                 │
```

### 5. Cores e Estilos

#### Palette de Cores por Temperatura:

**Quente (Hot)**
- Cor primária: `#10b981` (Emerald 500)
- Gradiente: `from-emerald-500 via-green-500 to-teal-500`
- Texto: Verde escuro no claro, verde claro no escuro
- Fundo: Verde muito claro com transparência
- Uso: Leads com score 76-100

**Morno (Warm)**
- Cor primária: `#f59e0b` (Amber 500)
- Gradiente: `from-amber-500 via-orange-500 to-yellow-500`
- Texto: Laranja/Amarelo escuro no claro, laranja claro no escuro
- Fundo: Amarelo muito claro com transparência
- Uso: Leads com score 51-75

**Frio (Cold)**
- Cor primária: `#64748b` (Slate 500)
- Gradiente: `from-slate-500 via-gray-500 to-zinc-500`
- Texto: Cinza escuro no claro, cinza claro no escuro
- Fundo: Cinza muito claro com transparência
- Uso: Leads com score 31-50

**Risco (Risk)**
- Cor primária: `#ef4444` (Red 500)
- Gradiente: `from-red-500 via-rose-500 to-pink-500`
- Texto: Vermelho escuro no claro, vermelho claro no escuro
- Fundo: Vermelho muito claro com transparência
- Uso: Leads com score 0-30

### 6. Ícones Utilizados

```
🔥 Flame         - Lead Quente
🌤️ Thermometer   - Lead Morno
❄️ Snowflake     - Lead Frio
⚠️ AlertTriangle - Lead em Risco

⏰ Clock         - Tempo sem resposta
💬 MessageSquare - Interações recentes
🏢 Building2     - Tipo de imóvel
🎬 Activity      - Ações do cliente
📈 TrendingUp    - Histórico do corretor
🎯 Target        - Prioridade
```

### 7. Responsividade

O sistema se adapta a diferentes tamanhos de tela:

**Desktop (>1024px)**
- 3 colunas: Risco | Quente | Morno
- Cards lado a lado
- Breakdown completo visível

**Tablet (768-1024px)**
- 2 colunas: Prioritários | Outros
- Cards menores
- Breakdown colapsável

**Mobile (<768px)**
- 1 coluna: Todos os leads ordenados por prioridade
- Cards compactos
- Informações essenciais apenas
- Tap para ver detalhes

### 8. Interações e Animações

**Hover nos Cards**
- Elevação sutil (shadow aumenta)
- Brilho no contorno (glow effect)
- Transição suave (300ms)

**Badge de Score**
- Tooltip ao passar mouse mostrando:
  - Descrição da temperatura
  - Range de pontos (ex: "76-100")
  - Recomendação de ação

**Gauge Circular**
- Animação de preenchimento ao carregar
- Pulsação no indicador atual
- Marcadores nos limites (30, 50, 75)

**Barras de Progresso**
- Animação de preenchimento da esquerda para direita
- Cores baseadas no percentual atingido
- Tooltip mostrando descrição do fator

### 9. Estados de Loading

**Carregando Leads**
```
┌─────────────────────────────────┐
│                                  │
│         ◉  ◉  ◉  ◉               │
│      Carregando leads...         │
│                                  │
└─────────────────────────────────┘
```

**Calculando Score**
```
┌─────────────────────────────────┐
│    ╱     ?     ╲                │
│   │   de 100    │               │
│    ╲           ╱                │
│   Calculando score...            │
└─────────────────────────────────┘
```

### 10. Fluxo de Uso

1. **Acesso à página de leads**
   - Sistema calcula automaticamente score de cada lead
   - Leads são ordenados por prioridade

2. **Visualização rápida**
   - Badge mostra temperatura e score
   - Ação recomendada aparece no card

3. **Detalhamento**
   - Click no lead abre modal ou expande card
   - Vê breakdown completo dos fatores
   - Entende o motivo do score

4. **Ação**
   - Botões de ação (Simular/Enviar) contextualizados
   - Prioriza leads em risco e quentes
   - Acompanha leads mornos

### 11. Acessibilidade

- **Cores**: Alto contraste, não depende apenas de cor
- **Ícones**: Sempre acompanhados de texto
- **Hover states**: Visíveis e claros
- **Keyboard navigation**: Totalmente navegável por teclado
- **Screen readers**: Labels apropriados em todos os elementos
- **Focus indicators**: Visíveis em modo escuro e claro

### 12. Dark Mode

Todas as cores e componentes se adaptam automaticamente ao modo escuro:

**Modo Claro**
- Fundos brancos com leve transparência
- Bordas sutis em cinza claro
- Texto escuro sobre fundo claro

**Modo Escuro**
- Fundos escuros (zinc-900) com transparência
- Bordas sutis em cinza escuro
- Texto claro sobre fundo escuro
- Cores mais vibrantes para badges

## 🎨 Componentes Reutilizáveis

### LeadScoreBadge
```tsx
<LeadScoreBadge
  temperature="Quente"
  score={85}
  showScore={true}
  size="md"
  variant="default"
  showTooltip={true}
/>
```

### LeadScoreCard
```tsx
<LeadScoreCard
  leadScore={scoreData}
  showBreakdown={true}
  variant="detailed"
/>
```

## 📊 Métricas Visuais

O sistema também fornece estatísticas agregadas:

```
┌────────────────────────────────────────┐
│  📊 Estatísticas de Score              │
│                                         │
│  Total de Leads: 142                   │
│  Score Médio: 58                       │
│                                         │
│  Distribuição:                         │
│  🔥 Quente:  28 (20%)  ████████        │
│  🌤️ Morno:   46 (32%)  ████████████    │
│  ❄️ Frio:    53 (37%)  ██████████████  │
│  ⚠️ Risco:   15 (11%)  ████            │
│                                         │
│  Top 10 Prioritários:                  │
│  1. Maria Silva      - Score: 95       │
│  2. João Santos      - Score: 89       │
│  3. Ana Costa        - Score: 87       │
│  ...                                    │
└────────────────────────────────────────┘
```

---

**Sistema desenvolvido com foco em UX e eficiência** ✨
