# Auditoria - Páginas com Dados Mockados

Data: 2026-01-29

## Resumo

Total de páginas encontradas: 74
Páginas com problemas: 8

---

## 🔴 Páginas com Mock ou "Em Breve"

### 1. `/admin/agenda` ⚠️
- **Linhas:** 415
- **Fetches:** 0
- **Problema:** Não busca dados reais
- **Status:** Precisa conectar com API

### 2. `/admin/automations` ⚠️
- **Linhas:** 267
- **Fetches:** 0
- **Problema:** Não busca dados reais
- **Status:** Precisa implementar API de automações

### 3. `/admin/performance` ⚠️
- **Linhas:** 253
- **Fetches:** 0
- **Problema:** Não busca dados reais
- **Status:** Precisa conectar com API (já existe `/api/corretor/performance`)

### 4. `/admin/score` ⚠️
- **Linhas:** 226
- **Fetches:** 0
- **Problema:** Não busca dados reais
- **Status:** Precisa implementar sistema de score

### 5. `/admin/pipeline` ❌
- **Linhas:** 8
- **Código:** `return null`
- **Problema:** Página vazia
- **Status:** Redirecionar para `/corretor/pipeline` ou implementar

### 6. `/admin/intermediacao` ⚠️
- **Linhas:** 815
- **Fetches:** 3
- **Problema:** Tem mock data como fallback quando API falha
- **Status:** Aceitável (fallback), mas idealmente API deveria funcionar

### 7. `/dashboard` ⚠️
- **Linhas:** 549
- **Problema:** Botão "Chat" desabilitado com badge "Em breve"
- **Status:** Já existe `/corretor/chat` funcional - pode linkar

### 8. `/leads` ⚠️
- **Linhas:** 780
- **Problema:** Botão "Filtrar" desabilitado com texto "(em breve)"
- **Status:** Implementar filtros avançados

---

## ✅ Páginas Funcionais (Principais)

### Admin
- ✅ `/admin/chat` - 1157 linhas, 7 fetches
- ✅ `/admin/equipe` - 896 linhas, 9 fetches
- ✅ `/admin/eventos` - 499 linhas, 2 fetches
- ✅ `/admin/gerentes` - 695 linhas, 7 fetches
- ✅ `/admin/leads` - 421 linhas, 2 fetches
- ✅ `/admin/mensagens` - 570 linhas, 6 fetches
- ✅ `/admin/permissoes` - 626 linhas, 6 fetches
- ✅ `/admin/whatsapp` - 563 linhas, 4 fetches

### Corretor (TODAS ✅)
- ✅ `/corretor/dashboard`
- ✅ `/corretor/chat`
- ✅ `/corretor/clientes`
- ✅ `/corretor/mensagens`
- ✅ `/corretor/pipeline`
- ✅ `/corretor/relatorios`
- ✅ `/corretor/salva-leads`
- ✅ `/corretor/whatsapp`
- ✅ `/corretor/imoveis`
- ✅ `/corretor/agenda` (CONSERTADO HOJE)
- ✅ `/corretor/performance` (CRIADO HOJE)
- ✅ `/corretor/propostas` (CRIADO HOJE)
- ✅ `/corretor/configuracoes`

---

## 🎯 Prioridades de Correção

### 🔴 Alta Prioridade
1. **`/admin/pipeline`** - página vazia (return null)
2. **`/admin/performance`** - pode reutilizar API de `/corretor/performance`
3. **`/leads`** - implementar filtros (botão "em breve")

### 🟡 Média Prioridade
4. **`/admin/agenda`** - pode reutilizar API de `/corretor/agenda`
5. **`/dashboard`** - habilitar botão Chat (já existe `/corretor/chat`)
6. **`/admin/score`** - implementar sistema de score de leads

### 🟢 Baixa Prioridade
7. **`/admin/automations`** - feature complexa, pode ficar para depois
8. **`/admin/intermediacao`** - já tem fallback funcional

---

## 📊 Estatísticas

- **Total de páginas:** 74
- **Páginas funcionais:** 66 (89%)
- **Páginas com mock/problemas:** 8 (11%)
- **Páginas "em breve":** 2
- **Páginas vazias (return null):** 1

---

## 🚀 Próximos Passos

### Opção A - Correção Rápida (4 páginas mais críticas)
1. `/admin/pipeline` - redirect ou implementar
2. `/admin/performance` - conectar API existente
3. `/leads` - implementar filtros
4. `/dashboard` - habilitar botão Chat

**Tempo estimado:** 1-2 horas

### Opção B - Correção Completa (todas as 8)
Incluir as 4 de baixa/média prioridade também.

**Tempo estimado:** 3-4 horas

### Opção C - Deixar como está
Focar em outras melhorias. As páginas com problemas não são críticas.

---

**Aguardando decisão:** Qual opção seguir?
