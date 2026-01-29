# Plano de Melhoria UX/UI

## Problemas Identificados

1. **Sidebar com muitos itens** (14 itens no total)
2. **Botões e modais muito simples**
3. **Fluxo de jornada confuso**

---

## Fase 1: Reorganização da Sidebar

### Situação Atual
```
Nav (4 itens):
- Início, Empreendimentos, Calculadora, Meu Perfil

Admin (10 itens):
- Dashboard, Chat, Pipeline, Equipe, Campanhas,
  Automações, Agenda, Relatórios, Leads, Status API
```

### Proposta: Agrupar em 4 Seções
```
PRINCIPAL
├── Dashboard (visão geral)
└── Pipeline (kanban de vendas)

COMUNICAÇÃO
├── Chat (conversas)
└── Campanhas (disparos em massa)

GESTÃO
├── Leads (lista completa)
├── Agenda (atividades)
└── Equipe (corretores)

CONFIGURAÇÕES
├── Automações
├── Relatórios
└── Status API
```

### Implementação
- Seções colapsáveis com ícones de chevron
- Indicador visual de seção ativa
- Contador de notificações (ex: "Chat (3)")
- Modo compacto (apenas ícones) para telas menores

---

## Fase 2: Melhoria de Componentes UI

### Botões
| Atual | Melhoria |
|-------|----------|
| Botão plano | Gradientes sutis + sombra |
| Sem feedback | Ripple effect no clique |
| Ícone estático | Animação no hover |

### Modais
| Atual | Melhoria |
|-------|----------|
| Header simples | Header com ícone + cor de destaque |
| Sem animação | Entrada com scale + fade |
| Footer básico | Botões com hierarquia clara (primário/secundário) |

### Cards
| Atual | Melhoria |
|-------|----------|
| Borda simples | Hover com elevação (shadow-lg) |
| Sem interação | Cursor pointer + transição suave |
| Conteúdo denso | Espaçamento generoso + tipografia clara |

---

## Fase 3: Fluxo de Jornada

### Quick Actions (Ações Rápidas)
Adicionar barra de ações rápidas no topo:
- "+ Novo Lead" (abre modal)
- "+ Nova Atividade" (abre modal)
- "Enviar WhatsApp" (abre seletor de contato)

### Breadcrumbs
```
Admin > Pipeline > Lead: João Silva
```
Navegação contextual em todas as páginas internas.

### Empty States
Quando não há dados, mostrar:
- Ilustração amigável
- Texto explicativo
- Botão de ação primária

### Onboarding
Primeiro acesso mostra tour guiado:
1. "Bem-vindo! Vamos começar..."
2. Destaca áreas principais
3. Sugere primeira ação

---

## Arquivos a Modificar

### Sidebar
| Arquivo | Mudança |
|---------|---------|
| `components/app-shell.tsx` | Reestruturar navegação em grupos |
| `components/ui/nav-group.tsx` | Criar componente de grupo colapsável |

### Componentes UI
| Arquivo | Mudança |
|---------|---------|
| `components/ui/button.tsx` | Adicionar variantes com gradiente |
| `components/ui/dialog.tsx` | Melhorar animações e header |
| `components/ui/card.tsx` | Adicionar hover states |

### Páginas
| Arquivo | Mudança |
|---------|---------|
| `app/admin/pipeline/page.tsx` | Quick actions + empty state |
| `app/admin/agenda/page.tsx` | Quick actions + empty state |
| `app/admin/leads/page.tsx` | Breadcrumbs + filtros visuais |

---

## Prioridade de Execução

### Sprint 1: Sidebar (Alto Impacto)
1. Criar `nav-group.tsx` com animação de collapse
2. Reorganizar `app-shell.tsx` em 4 grupos
3. Adicionar contadores de notificação

### Sprint 2: Componentes Base
4. Melhorar `button.tsx` com variantes
5. Melhorar `dialog.tsx` com animações
6. Melhorar `card.tsx` com hover

### Sprint 3: Páginas Principais
7. Adicionar quick actions no header
8. Implementar breadcrumbs
9. Criar empty states personalizados

### Sprint 4: Polish Final
10. Revisar espaçamentos e tipografia
11. Adicionar micro-interações
12. Testar em dispositivos móveis

---

## Estimativa de Arquivos

- **Novos:** 3 (`nav-group.tsx`, `breadcrumbs.tsx`, `empty-state.tsx`)
- **Modificados:** 8 (app-shell, button, dialog, card, 4 páginas)
- **Total:** 11 arquivos

---

## Mockup Visual: Nova Sidebar

```
┌─────────────────────────┐
│  🏠 Prática CRM         │
├─────────────────────────┤
│                         │
│  PRINCIPAL          ▼   │
│    📊 Dashboard         │
│    🔀 Pipeline          │
│                         │
│  COMUNICAÇÃO        ▶   │
│                         │
│  GESTÃO             ▶   │
│                         │
│  CONFIGURAÇÕES      ▶   │
│                         │
├─────────────────────────┤
│  👤 Meu Perfil          │
│  🚪 Sair                │
└─────────────────────────┘
```

---

## Aprovação

- [ ] Reorganização da sidebar em grupos
- [ ] Melhoria de botões com variantes
- [ ] Melhoria de modais com animações
- [ ] Quick actions nas páginas
- [ ] Breadcrumbs para navegação
- [ ] Empty states personalizados
