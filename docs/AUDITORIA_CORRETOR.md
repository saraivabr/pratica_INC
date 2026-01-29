# Auditoria - Páginas de Corretor

Data: 2026-01-29
Auditor: Jesus (IA)

## Resumo Executivo

**Total de páginas:** 13
**Funcionando 100%:** 7 páginas ✅
**Com dados mockados:** 4 páginas ⚠️
**Com problemas críticos:** 2 páginas ❌

---

## Status por Página

### ✅ FUNCIONANDO - Dados Reais

#### 1. Dashboard (`/corretor`)
- **Linhas:** 861
- **Status:** ✅ Funcional
- **APIs:** `/api/whatsapp/session/status`, `/api/leads?limit=100`
- **Dados:** Reais (leads, WhatsApp status)
- **Problemas:** Nenhum

#### 2. Chat (`/corretor/chat`)
- **Linhas:** 168
- **Status:** ✅ Funcional
- **APIs:** `/api/whatsapp/session/status`
- **Dados:** Reais (WhatsApp)
- **Problemas:** Página simples, poderia ter mais funcionalidades

#### 3. Clientes (`/corretor/clientes`)
- **Linhas:** 919
- **Status:** ✅ Funcional
- **APIs:** `/api/leads?limit=200`
- **Dados:** Reais (leads do DB)
- **Features:** Jornada "Novo Cliente", busca, filtros
- **Problemas:** Nenhum

#### 4. Mensagens (`/corretor/mensagens`)
- **Linhas:** 504
- **Status:** ✅ Funcional
- **APIs:** `/api/whatsapp/session/status`, `/api/whatsapp/sync`
- **Dados:** Reais (WhatsApp messages)
- **Problemas:** Nenhum

#### 5. Pipeline (`/corretor/pipeline`)
- **Linhas:** 413
- **Status:** ✅ Funcional (RECÉM ATUALIZADO)
- **APIs:** `/api/leads`
- **Dados:** Reais (leads)
- **Features:** Kanban board moderno, score de IA, sidebar com ações
- **Problemas:** Nenhum

#### 6. Relatórios (`/corretor/relatorios`)
- **Linhas:** 459
- **Status:** ✅ Funcional
- **APIs:** `/api/leads?limit=200`, `/api/corretor/relatorios`
- **Dados:** Reais (leads semanais, interações, comissão)
- **Problemas:** Nenhum

#### 7. CataVendas (`/corretor/salva-leads`)
- **Linhas:** 1694
- **Status:** ✅ Funcional (CONSERTADO HOJE)
- **APIs:** `/api/salva-leads/*`, `/api/whatsapp/sync/opportunities`
- **Dados:** Reais (conversas, oportunidades)
- **Bug Resolvido:** workspaceId obrigatório ✅
- **Problemas:** Nenhum

#### 8. WhatsApp (`/corretor/whatsapp`)
- **Linhas:** 426
- **Status:** ✅ Funcional
- **APIs:** `/api/whatsapp/session/*`
- **Dados:** Reais (QR code, status, desconectar)
- **Problemas:** Nenhum

---

### ⚠️ MOCKADO - Sem Dados Reais

#### 9. Agenda (`/corretor/agenda`)
- **Linhas:** 445
- **Status:** ⚠️ Mockado
- **APIs:** Nenhuma
- **Dados:** Array local mockado
- **Problemas:**
  - Não busca eventos reais do banco
  - Precisa conectar com `/api/agenda` ou `/api/visitas`
  - Calendário estático

**Sugestão:** Criar API `/api/corretor/agenda` que retorne visitas agendadas dos leads

#### 10. Imóveis (`/corretor/imoveis`)
- **Linhas:** 503
- **Status:** ⚠️ Mockado
- **APIs:** Nenhuma
- **Dados:** Array local mockado
- **Problemas:**
  - Não busca empreendimentos reais
  - Deveria usar `/api/empreendimentos`
  - Poderia mostrar unidades disponíveis

**Sugestão:** Conectar com `/api/empreendimentos` que já existe e funciona

#### 11. Performance (`/corretor/performance`)
- **Linhas:** 119
- **Status:** ⚠️ Mockado
- **APIs:** Nenhuma
- **Dados:** Valores hardcoded
- **Problemas:**
  - Sem useEffect
  - Métricas estáticas
  - Não busca dados reais de vendas/conversão

**Sugestão:** Criar API `/api/corretor/performance` com métricas calculadas

---

### ❌ CRÍTICO - Placeholder "Em Breve"

#### 12. Propostas (`/corretor/propostas`)
- **Linhas:** 121
- **Status:** ❌ Placeholder
- **APIs:** Nenhuma
- **Dados:** Nenhum
- **Problemas:**
  - Página quase vazia
  - Mostra "Em breve"
  - Precisa ser implementada do zero

**Sugestão:** Implementar sistema de propostas conectado aos leads

#### 13. Configurações (`/corretor/configuracoes`)
- **Linhas:** 396
- **Status:** ⚠️ Parcial
- **APIs:** `/api/whatsapp/session/status`, `/api/auth/profile`
- **Dados:** Perfil real + WhatsApp
- **Problemas:**
  - Algumas seções incompletas
  - Poderia ter mais opções

**Sugestão:** Expandir com preferências, notificações, etc.

---

## Prioridades de Correção

### 🔴 Alta Prioridade
1. **Propostas** - Implementar do zero (página crítica para vendas)
2. **Agenda** - Conectar com dados reais (visitas agendadas)
3. **Performance** - Métricas reais de conversão

### 🟡 Média Prioridade
4. **Imóveis** - Conectar com `/api/empreendimentos` existente
5. **Configurações** - Expandir opções

---

## APIs Faltando

### Precisam ser criadas:
1. `/api/corretor/agenda` - GET (visitas agendadas)
2. `/api/corretor/performance` - GET (métricas: leads, conversão, tempo médio, comissão)
3. `/api/corretor/propostas` - GET/POST/PATCH (CRUD de propostas)

### Já existem e podem ser reutilizadas:
- `/api/empreendimentos` ✅ (para página Imóveis)
- `/api/leads` ✅ (já usado em várias páginas)
- `/api/whatsapp/session/*` ✅ (WhatsApp)

---

## Recomendações Gerais

### UX/UI
- ✅ Pipeline já tem design moderno (aplicado hoje)
- ⚠️ Outras páginas ainda têm design antigo
- Sugestão: aplicar design do pipeline nas outras páginas

### Performance
- ✅ Maioria das páginas tem loading states
- ✅ APIs são rápidas
- ⚠️ Algumas páginas poderiam usar React Query para cache

### Responsividade
- ✅ Maioria é mobile-friendly
- ⚠️ Agenda poderia melhorar em mobile

---

## Próximos Passos

**Opção A - Correção Total (tudo funcional):**
1. Implementar API de agenda + conectar
2. Conectar Imóveis com `/api/empreendimentos`
3. Criar sistema de Propostas completo
4. Criar API de Performance + conectar
5. Aplicar design moderno em todas

**Opção B - Priorizar Critical Path (vendas):**
1. Propostas (crítico para fluxo de vendas)
2. Performance (métricas importantes)
3. Agenda (follow-ups)
4. Resto depois

**Opção C - Quick Wins:**
1. Imóveis (fácil - API já existe)
2. Agenda (média complexidade)
3. Propostas (complexa)
4. Performance (média)

---

**Aguardando decisão:** Qual opção seguir? Ou focar em algo específico?
