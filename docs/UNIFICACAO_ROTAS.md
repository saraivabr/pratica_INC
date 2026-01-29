# Proposta - Unificação de Rotas Admin/Corretor

## Estrutura Atual (Problemática)

```
/admin/
  - agenda
  - chat
  - mensagens
  - performance
  - pipeline
  - whatsapp
  - leads
  - equipe
  - permissoes
  - ...

/corretor/
  - agenda           (DUPLICADO)
  - chat             (DUPLICADO)
  - mensagens        (DUPLICADO)
  - performance      (DUPLICADO)
  - pipeline         (DUPLICADO)
  - whatsapp         (DUPLICADO)
  - clientes
  - imoveis
  - propostas
  - ...
```

**Problema:** Usuário admin tem que escolher entre `/admin/chat` e `/corretor/chat`

---

## Estrutura Proposta (Unificada)

```
/ (raiz)
  ├─ /dashboard          → detecta role, mostra dashboard apropriado
  ├─ /chat               → unificado, adapta UI por role
  ├─ /mensagens          → unificado
  ├─ /pipeline           → unificado (kanban)
  ├─ /agenda             → unificado (calendário)
  ├─ /performance        → unificado (métricas)
  ├─ /whatsapp           → unificado (QR code, status)
  ├─ /leads              → unificado (lista + filtros)
  ├─ /clientes           → alias para /leads (nome melhor para corretor)
  ├─ /imoveis            → empreendimentos (todos podem ver)
  ├─ /propostas          → todos podem criar
  ├─ /relatorios         → unificado
  └─ /catavendas         → todos (era salva-leads)

/admin/ (só admin)
  ├─ /equipe             → gestão de usuários
  ├─ /permissoes         → controle de acesso
  ├─ /intermediacao      → financeiro/comissões
  ├─ /gerentes           → hierarquia
  └─ /sofia              → configuração da IA

/configuracoes           → perfil pessoal (todos)
```

---

## Vantagens

✅ **Navegação única** - `/chat` em vez de escolher entre admin/corretor
✅ **Menos redundância** - 1 página em vez de 2
✅ **Mais rápido** - menos cliques
✅ **Lógica centralizada** - role detection em um lugar só
✅ **Manutenção fácil** - atualizar 1 arquivo em vez de 2

---

## Como Implementar

### 1. Páginas com Role Detection

Exemplo `/app/chat/page.tsx`:

```tsx
export default function ChatPage() {
  const { user } = useAuth()
  
  // Adapta UI baseado no role
  if (user?.role === 'admin') {
    return <AdminChatView />
  }
  
  return <CorretorChatView />
}
```

### 2. Migração Gradual

**Fase 1 - Redirects (sem quebrar nada):**
```tsx
// /app/admin/chat/page.tsx
export default function AdminChatRedirect() {
  redirect('/chat')
}

// /app/corretor/chat/page.tsx
export default function CorretorChatRedirect() {
  redirect('/chat')
}
```

**Fase 2 - Unificação real:**
- Mover lógica para `/app/chat/page.tsx`
- Deletar `/admin/chat` e `/corretor/chat`

**Fase 3 - Atualizar navegação:**
- `app-shell.tsx` com menu único
- Role detection para mostrar/esconder itens

---

## Prioridade de Migração

### 🔴 Alta (mais usadas, duplicadas)
1. `/dashboard` ← admin/dashboard + corretor/dashboard
2. `/chat` ← admin/chat + corretor/chat
3. `/pipeline` ← admin/pipeline + corretor/pipeline
4. `/whatsapp` ← admin/whatsapp + corretor/whatsapp
5. `/mensagens` ← admin/mensagens + corretor/mensagens

### 🟡 Média
6. `/agenda` ← admin/agenda + corretor/agenda
7. `/performance` ← admin/performance + corretor/performance
8. `/leads` ← admin/leads + corretor/clientes

### 🟢 Baixa (únicas, podem ficar)
- `/admin/equipe`
- `/admin/permissoes`
- `/admin/intermediacao`
- `/propostas` (já é única)
- `/imoveis` (já é única)

---

## Menu de Navegação Unificado

```tsx
// Exemplo de navegação adaptável
const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: Workflow },
  { href: "/leads", label: user.role === 'admin' ? "Todos os Leads" : "Meus Clientes", icon: Users },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/whatsapp", label: "WhatsApp", icon: Phone },
  { href: "/agenda", label: "Agenda", icon: Calendar },
  { href: "/imoveis", label: "Imóveis", icon: Building2 },
  
  // Admin only
  ...(user.role === 'admin' ? [
    { href: "/admin/equipe", label: "Equipe", icon: Users },
    { href: "/admin/intermediacao", label: "Financeiro", icon: DollarSign },
    { href: "/admin/permissoes", label: "Permissões", icon: Shield },
  ] : []),
]
```

---

## Decisão

**Opção A - Migração Completa (Recomendado)**
- Implementar estrutura unificada
- Redirects temporários para não quebrar
- Menu único adaptável
- Tempo: 2-3 horas

**Opção B - Redirects Simples**
- Só criar redirects de `/admin/*` → `/corretor/*`
- Não unificar de verdade
- Tempo: 30 minutos

**Opção C - Manter Separado**
- Não mudar nada
- Tempo: 0

---

**Qual opção você prefere?**
