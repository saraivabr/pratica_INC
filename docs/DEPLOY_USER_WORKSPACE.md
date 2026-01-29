# 🚀 Deploy: User Workspace Architecture

**Migração:** tenant_id → workspace_id  
**Objetivo:** Cada usuário tem seu workspace isolado (1 user = 1 workspace)  
**Data:** 28 Jan 2026

---

## ⏱️ Tempo Estimado

- **Preparação:** 15 min
- **Migração SQL:** 5-10 min
- **Código:** 2-3h (automático com script)
- **Webhooks:** 10 min
- **Testes:** 30 min
- **Deploy:** 15 min

**Total:** ~4-5 horas

---

## 📋 Checklist Pré-Deploy

### ✅ Validações

```bash
cd /Users/saraiva/_Projetos/appnovo_pratica

# 1. Git status limpo
git status

# 2. Variáveis de ambiente configuradas
echo $WEBHOOK_BASE_URL
# Deve retornar: https://app.pratica.com (ou seu domínio)

# 3. Backup do banco (opcional mas recomendado)
scalingo -a pratica --region osc-fr1 backups-create

# 4. Verificar quantos usuários existem
echo "SELECT COUNT(*) FROM users;" | \
  scalingo -a pratica --region osc-fr1 pgsql-console
```

---

## 🗃️ Fase 1: Migração do Banco (10 min)

### 1.1 Validar Migração SQL

```bash
# Verificar sintaxe (dry-run local se tiver PostgreSQL local)
cat migrations/022_user_workspace_architecture.sql

# Validar que não há erros de sintaxe
grep -i "error\|erro" migrations/022_user_workspace_architecture.sql
```

### 1.2 Aplicar Migração no Scalingo

```bash
# Aplicar migração
cat migrations/022_user_workspace_architecture.sql | \
  scalingo -a pratica --region osc-fr1 pgsql-console
```

**Saída esperada:**
```
BEGIN
CREATE TABLE
CREATE TABLE
...
✅ Migração OK: Todos os usuários têm workspace!
COMMIT
```

### 1.3 Validar Migração

```bash
# Verificar que workspaces foram criados
echo "SELECT COUNT(*) FROM workspaces;" | \
  scalingo -a pratica --region osc-fr1 pgsql-console

# Verificar que users têm workspace_id
echo "SELECT COUNT(*) FROM users WHERE workspace_id IS NOT NULL;" | \
  scalingo -a pratica --region osc-fr1 pgsql-console

# Verificar migração de dados
echo "SELECT COUNT(*) FROM cvcrm_leads WHERE workspace_id IS NOT NULL;" | \
  scalingo -a pratica --region osc-fr1 pgsql-console

echo "SELECT COUNT(*) FROM whatsapp_messages WHERE workspace_id IS NOT NULL;" | \
  scalingo -a pratica --region osc-fr1 pgsql-console
```

**✅ Sucesso:** Todos os counts devem ser iguais (ou maioria com workspace_id)

---

## 💻 Fase 2: Atualizar Código (2-3h)

### 2.1 Atualizar APIs Automaticamente

```bash
# Dar permissão de execução
chmod +x scripts/migrate-apis-to-workspace.sh

# Executar script de migração
bash scripts/migrate-apis-to-workspace.sh
```

**O script faz:**
- ✅ Cria backup em `backups/pre-workspace-migration-YYYYMMDD-HHMMSS/`
- ✅ Substitui `tenantId` → `workspaceId` em todos os arquivos
- ✅ Substitui `tenant_id` → `workspace_id` em queries SQL
- ✅ Substitui `requireTenantContext` → `requireWorkspaceContext`
- ✅ Verifica se ainda há referências a "tenant"

### 2.2 Revisar Mudanças

```bash
# Ver arquivos modificados
git status

# Ver mudanças linha por linha
git diff app/api
git diff lib

# Caso queira reverter alguma mudança
# git checkout -- path/to/file
```

### 2.3 Correções Manuais (Se Necessário)

Alguns arquivos podem precisar de ajuste manual:

```bash
# Buscar referências restantes
grep -rn "tenantId\|tenant_id" app/api lib --include="*.ts" | \
  grep -v "workspace_id" | \
  grep -v "//"
```

**Arquivos que podem precisar atenção:**
- `lib/tenant-context.ts` → pode ser renomeado para `workspace-context.ts`
- Imports antigos de `TenantContext`
- Comentários que mencionam "tenant"

---

## 🔗 Fase 3: Atualizar Webhooks Evolution (10 min)

### 3.1 Atualizar URLs de Webhook

```bash
# Instalar dependências se necessário
pnpm install

# Executar script de atualização
tsx scripts/update-webhook-urls.ts
```

**O script faz:**
- ✅ Busca todos os workspaces com instância Evolution
- ✅ Atualiza webhook URL: `/evolution/{tenantId}` → `/evolution/{workspaceId}`
- ✅ Mantém eventos configurados

**Saída esperada:**
```
🔄 Atualizando URLs de webhook Evolution API...

📊 Encontrados 5 workspaces com Evolution API

🔧 Workspace 1 (João Silva - Workspace)
   Instance: corretor-abc123-1706123456
   Nova URL: https://app.pratica.com/api/webhook/evolution/1
   ✅ Webhook atualizado com sucesso
...
✅ Atualização concluída!
```

### 3.2 Validar Webhooks

```bash
# Listar instâncias e verificar webhooks
# (opcional - apenas se quiser conferir manualmente)
```

---

## 🔍 Fase 4: Testes Locais (30 min)

### 4.1 Rodar Testes Automatizados

```bash
# Unit tests
pnpm test:unit

# Integration tests
pnpm test:integration
```

### 4.2 Testes Manuais

#### Teste 1: Login
```bash
# 1. Abrir http://localhost:3000/login
# 2. Fazer login com telefone
# 3. Verificar que workspace_id está no cookie
#    → DevTools > Application > Cookies > pratica-session
#    → Deve conter: "workspaceId":1
```

#### Teste 2: Isolamento de Leads
```bash
# 1. Login como Usuário A
# 2. Criar lead
# 3. Logout

# 4. Login como Usuário B
# 5. Verificar que NÃO VÊ o lead do Usuário A
# ✅ Isolamento funcionando!
```

#### Teste 3: WhatsApp
```bash
# 1. Conectar WhatsApp
# 2. Enviar mensagem de teste
# 3. Verificar que webhook recebeu (logs)
# 4. Verificar que mensagem foi salva com workspace_id correto
```

---

## 🚀 Fase 5: Deploy Produção (15 min)

### 5.1 Commit e Push

```bash
# Adicionar arquivos modificados
git add .

# Commit
git commit -m "feat: implement User Workspace Architecture

- Replace tenant_id with workspace_id
- Each user has isolated workspace (1 user = 1 workspace)
- Better data isolation and security
- Auto-create workspace for new users
- Migrate existing data to workspaces
- Update all API routes and helpers
- Update Evolution webhook URLs

Migration: 022_user_workspace_architecture.sql
"

# Push
git push origin main
```

### 5.2 Deploy Automático (Se Configurado)

Se Scalingo está configurado para deploy automático via Git:

```bash
# Verificar deploy
scalingo -a pratica --region osc-fr1 deployments

# Ver logs do deploy
scalingo -a pratica --region osc-fr1 logs -f
```

### 5.3 Deploy Manual (Se Necessário)

```bash
# Build local
pnpm build

# Deploy via CLI
scalingo -a pratica --region osc-fr1 deploy .
```

---

## ✅ Fase 6: Validação Pós-Deploy (10 min)

### 6.1 Health Check

```bash
# Verificar que app está rodando
curl https://app.pratica.com/api/health

# Ver logs em tempo real
scalingo -a pratica --region osc-fr1 logs -f
```

### 6.2 Testes em Produção

#### Teste 1: Login Produção
```
1. Abrir https://app.pratica.com/login
2. Fazer login
3. Verificar redirecionamento correto (admin ou corretor)
4. Verificar que workspace_id está presente no cookie
```

#### Teste 2: APIs Funcionando
```bash
# Testar endpoint de leads (exemplo)
curl -H "Cookie: pratica-session=..." \
  https://app.pratica.com/api/cvcrm/leads

# Deve retornar apenas leads do workspace do usuário
```

#### Teste 3: WhatsApp Funcionando
```
1. Enviar mensagem WhatsApp para instância conectada
2. Verificar logs: scalingo -a pratica logs -f
3. Confirmar que mensagem foi processada
4. Verificar que webhook usou workspace_id correto
```

### 6.3 Monitoramento

```bash
# Ver métricas
scalingo -a pratica --region osc-fr1 stats

# Ver logs de erros (se houver)
scalingo -a pratica --region osc-fr1 logs -f | grep -i error
```

---

## 🐛 Troubleshooting

### Problema: Migração SQL falhou

**Sintomas:** Erro ao aplicar migração

**Solução:**
```bash
# Verificar o que deu errado
echo "SELECT * FROM pg_stat_activity WHERE state != 'idle';" | \
  scalingo -a pratica --region osc-fr1 pgsql-console

# Se necessário, fazer rollback manual
# (use backup criado antes da migração)
```

### Problema: Usuários sem workspace_id

**Sintomas:** Erro "workspace not found" ao fazer login

**Solução:**
```sql
-- Criar workspaces para usuários sem workspace_id
INSERT INTO workspaces (owner_id, name, slug, type)
SELECT 
  u.id,
  u.nome || ' - Workspace',
  'user-' || u.id || '-' || FLOOR(EXTRACT(EPOCH FROM NOW())),
  'personal'
FROM users u
WHERE u.workspace_id IS NULL;

-- Atualizar users
UPDATE users u
SET workspace_id = w.id
FROM workspaces w
WHERE w.owner_id = u.id
  AND u.workspace_id IS NULL;
```

### Problema: Webhooks não funcionam

**Sintomas:** Mensagens WhatsApp não chegam

**Solução:**
```bash
# Re-rodar script de atualização
tsx scripts/update-webhook-urls.ts

# Verificar WEBHOOK_BASE_URL está correto
scalingo -a pratica --region osc-fr1 env | grep WEBHOOK
```

### Problema: APIs retornando erro 500

**Sintomas:** Chamadas de API falham com erro 500

**Solução:**
```bash
# Ver logs detalhados
scalingo -a pratica --region osc-fr1 logs -f

# Verificar se ainda existem referências a tenant_id
grep -rn "tenant_id" app/api lib --include="*.ts"

# Corrigir manualmente se necessário
```

---

## 📊 Rollback (Se Necessário)

### Rollback do Código

```bash
# Reverter commit
git revert HEAD

# Push
git push origin main

# Deploy será automático
```

### Rollback do Banco (CUIDADO!)

```bash
# Restaurar backup criado antes da migração
scalingo -a pratica --region osc-fr1 backups-restore <backup-id>

# AVISO: Isso apaga TODOS os dados criados após o backup!
```

---

## ✅ Checklist Pós-Deploy

- [ ] Migração SQL aplicada com sucesso
- [ ] Todos os usuários têm workspace_id
- [ ] APIs atualizadas (workspace_id em vez de tenant_id)
- [ ] Webhooks Evolution atualizados
- [ ] Login funciona e retorna workspace_id
- [ ] Isolamento de dados validado
- [ ] WhatsApp recebe e processa mensagens
- [ ] Logs sem erros críticos
- [ ] Monitoramento ativo

---

## 📈 Próximos Passos (Opcional)

### Melhorias Futuras

1. **Compartilhamento de Workspace** (opcional)
   - Implementar `workspace_members`
   - Permitir que admin adicione usuários ao workspace
   - Controle de permissões granular

2. **Migração de Imobiliárias** (se necessário)
   - Script para agrupar usuários por imobiliária em workspaces compartilhados
   - Manter isolamento mas permitir colaboração

3. **Analytics por Workspace**
   - Dashboard de métricas por workspace
   - Uso de recursos, leads, mensagens, etc.

4. **Planos por Workspace**
   - free, pro, enterprise por workspace
   - Limites configuráveis

---

## 📞 Suporte

**Em caso de problemas críticos:**

1. Verificar logs: `scalingo logs -f`
2. Consultar documentação: `/docs`
3. Revisar este guia
4. Rollback se necessário (ver seção acima)

---

**Criado em:** 28 Jan 2026  
**Por:** Claude (Moltbot)  
**Arquitetura:** User Workspace (v2)  
**Status:** 🚀 Pronto para Deploy
