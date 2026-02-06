# Phase 1: Correções Críticas de Integridade - Guia de Implementação

## 📌 Resumo da Fase 1

**Objetivo**: Garantir integridade referencial básica e limpar arquitetura de multi-tenant

**Duração Estimada**: 2 semanas (Sprint 1-2)
**Esforço**: 80 horas
**Complexidade**: Média (sem breaking changes no código ainda)
**Downtime**: Nenhum

### O que será feito

1. ✅ Adicionar 40+ Foreign Key Constraints (Migration 040)
2. ✅ Remover tenant_id deprecated (Migration 041)
3. ✅ Consolidar tabelas duplicadas (Migration 042)
4. ✅ Atualizar código TypeScript
5. ✅ Testar integridade
6. ✅ Deploy em staging
7. ✅ Deploy em produção

---

## 🚀 Passo 1: Preparação

### 1.1 Criar branch de feature

```bash
git checkout -b feat/database-standardization
git branch -u origin/feat/database-standardization
```

### 1.2 Backup do banco

```bash
# Local (para testes)
pg_dump -U pratica pratica > backup_before_phase1.sql

# Produção (VPS)
ssh root@185.182.184.122 "pg_dump -U pratica pratica" > backup_vps_$(date +%Y%m%d_%H%M%S).sql
```

### 1.3 Verificar conectividade

```bash
# Local
psql -U pratica -d pratica -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# VPS (direto)
ssh root@185.182.184.122 "psql -U pratica -d pratica -c 'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = \"public\";'"
```

---

## 📋 Passo 2: Migration 040 - Adicionar Foreign Keys

### 2.1 Executar migration

```bash
# LOCAL (para testes)
psql -U pratica -d pratica < migrations/040_add_foreign_keys.sql

# VPS (produção)
ssh root@185.182.184.122 "psql -U pratica -d pratica" < migrations/040_add_foreign_keys.sql
```

### 2.2 Validar execução

```bash
# Contar FKs adicionadas
psql -U pratica -d pratica -c "
  SELECT COUNT(*) as total_foreign_keys
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
  AND constraint_type = 'FOREIGN KEY'
  AND constraint_name LIKE 'fk_%';
"

# Esperado: 40+ foreign keys
```

### 2.3 Verificar orphan records

```bash
# Identificar colunas _id sem FK
psql -U pratica -d pratica -c "
  SELECT
    t.table_name,
    c.column_name
  FROM information_schema.columns c
  JOIN information_schema.tables t ON c.table_name = t.table_name
  WHERE t.table_schema = 'public'
  AND c.column_name LIKE '%_id'
  AND c.column_name != 'id'
  AND c.column_name != 'workspace_id'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage ccu
    WHERE ccu.table_name = c.table_name
    AND ccu.column_name = c.column_name
  )
  ORDER BY t.table_name, c.column_name;
"

# Esperado: Muito menos colunas sem FK (maioria resolvida)
```

### 2.4 Testar aplicação

```bash
# Rodar testes unitários
pnpm test

# Rodar testes E2E
pnpm test:e2e

# Verificar se há erros de FK
grep -r "FOREIGN KEY" app/ lib/ | grep "ERROR"
```

### ✅ Milestone 1 Concluído
- [x] Migration 040 executada
- [x] 40+ Foreign Keys adicionadas
- [x] Testes passam
- [x] Sem downtime observado

---

## 📋 Passo 3: Preparação para Migration 041

### 3.1 Fazer audit do código TypeScript

Antes de remover `tenant_id`, identificar todas as referências:

```bash
# Encontrar todas as referências a tenant_id no código
grep -r "tenant_id" app/ lib/ --include="*.ts" --include="*.tsx"

# Contar referências
grep -r "tenant_id" app/ lib/ --include="*.ts" --include="*.tsx" | wc -l

# Esperado: 50-100+ referências
```

### 3.2 Criar lista de arquivos a atualizar

```bash
# Gerar lista de arquivos únicos que usam tenant_id
grep -r "tenant_id" app/ lib/ --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort -u > /tmp/files_to_update.txt

# Ver quantos arquivos
wc -l /tmp/files_to_update.txt

# Exemplo de saída esperada:
# 40-60 arquivos
```

### 3.3 Analisar padrões de uso

```typescript
// Padrões comuns a remover:

// ❌ REMOVER:
const { tenant_id } = getCurrentTenant();
WHERE tenant_id = $1

// ✅ MANTER/SUBSTITUIR:
const { workspace_id } = getCurrentWorkspace();
WHERE workspace_id = $1
```

---

## 📋 Passo 4: Migration 041 - Remover tenant_id

### 4.1 Validação pré-migration

```bash
# Verificar que workspace_id está 100% preenchido em tabelas críticas
psql -U pratica -d pratica << 'EOF'
SELECT
  table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN workspace_id IS NULL THEN 1 END) as null_workspace_id
FROM (
  SELECT 'cvcrm_leads' as table_name, workspace_id FROM cvcrm_leads
  UNION ALL
  SELECT 'whatsapp_messages', workspace_id FROM whatsapp_messages
  UNION ALL
  SELECT 'eventos', workspace_id FROM eventos
  UNION ALL
  SELECT 'comissao_vendas', workspace_id FROM comissao_vendas
) data
GROUP BY table_name
ORDER BY table_name;
EOF

# Esperado: null_workspace_id = 0 para todas as tabelas
```

### 4.2 Executar migration

```bash
# LOCAL
psql -U pratica -d pratica < migrations/041_remove_tenant_id.sql

# VPS
ssh root@185.182.184.122 "psql -U pratica -d pratica" < migrations/041_remove_tenant_id.sql
```

### 4.3 Validar remoção

```bash
# Verificar que tenant_id foi removido
psql -U pratica -d pratica -c "
  SELECT COUNT(*) as remaining_tenant_id_columns
  FROM information_schema.columns
  WHERE column_name = 'tenant_id'
  AND table_schema = 'public';
"

# Esperado: 0 (nenhuma coluna tenant_id restante)

# Verificar que tabela tenants foi removida
psql -U pratica -d pratica -c "
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'tenants'
  ) as table_exists;
"

# Esperado: false
```

### 4.4 Atualizar código TypeScript

Agora que `tenant_id` foi removido do banco, atualizar código:

#### 4.4.1 Listar mudanças necessárias

```bash
# Exemplo de arquivos típicos a atualizar:
# - lib/api-auth.ts
# - lib/db.ts
# - app/api/auth/*.ts
# - app/api/admin/*.ts
```

#### 4.4.2 Padrão de mudança

**ANTES**:
```typescript
// lib/db.ts
export async function getLeads(tenantId: number) {
  return db.query(
    'SELECT * FROM cvcrm_leads WHERE tenant_id = $1',
    [tenantId]
  );
}

// lib/api-auth.ts
const tenantId = getTenantIdFromRequest(req);
const workspaceId = convertTenantToWorkspace(tenantId);
```

**DEPOIS**:
```typescript
// lib/db.ts
export async function getLeads(workspaceId: number) {
  return db.query(
    'SELECT * FROM cvcrm_leads WHERE workspace_id = $1',
    [workspaceId]
  );
}

// lib/api-auth.ts
const workspaceId = getWorkspaceIdFromRequest(req);
// Remover função convertTenantToWorkspace
```

#### 4.4.3 Script de busca e substituição

```bash
# Recomendado: Fazer manualmente com busca/substituição em IDE
# Mas para começar, fazer com sed:

# ⚠️ NÃO EXECUTAR SEM REVIEW MANUAL PRIMEIRO
# sed -i 's/tenant_id/workspace_id/g' app/api/**/*.ts

# Melhor: usar IDE search and replace com regex
# Find: WHERE tenant_id = \$(\d+)
# Replace: WHERE workspace_id = $$1
```

### 4.5 Testar após atualização de código

```bash
# Testes unitários
pnpm test

# Testes E2E
pnpm test:e2e

# Verificar que não há mais referências a tenant_id
grep -r "tenant_id" app/ lib/ --include="*.ts" --include="*.tsx" | wc -l
# Esperado: 0
```

### ✅ Milestone 2 Concluído
- [x] Migration 041 executada
- [x] Tabela tenants removida
- [x] tenant_id removido de 150+ tabelas
- [x] Código TypeScript atualizado
- [x] Testes passam
- [x] Nenhuma referência a tenant_id restante

---

## 📋 Passo 5: Migration 042 - Consolidar Duplicatas

### 5.1 Verificar estrutura de tabelas antigas

```bash
# Verificar se sync_logs existe
psql -U pratica -d pratica -c "\d sync_logs"

# Verificar se sync_cursors existe
psql -U pratica -d pratica -c "\d sync_cursors"

# Contar registros
psql -U pratica -d pratica -c "
  SELECT
    'sync_logs' as table_name,
    COUNT(*) as count
  FROM sync_logs
  UNION ALL
  SELECT 'sync_cursors', COUNT(*) FROM sync_cursors
  UNION ALL
  SELECT 'cvcrm_sync_logs', COUNT(*) FROM cvcrm_sync_logs
  UNION ALL
  SELECT 'cvcrm_sync_cursors', COUNT(*) FROM cvcrm_sync_cursors;
"
```

### 5.2 Executar migration

```bash
# LOCAL
psql -U pratica -d pratica < migrations/042_consolidate_duplicates.sql

# VPS
ssh root@185.182.184.122 "psql -U pratica -d pratica" < migrations/042_consolidate_duplicates.sql
```

### 5.3 Validar consolidação

```bash
# Verificar que dados foram migrados
psql -U pratica -d pratica -c "
  SELECT
    'cvcrm_sync_logs' as table_name,
    COUNT(*) as count
  FROM cvcrm_sync_logs
  UNION ALL
  SELECT 'cvcrm_sync_cursors', COUNT(*) FROM cvcrm_sync_cursors
  UNION ALL
  SELECT 'sync_logs (remaining)', COUNT(*) FROM sync_logs
  UNION ALL
  SELECT 'sync_cursors (remaining)', COUNT(*) FROM sync_cursors;
"

# Esperado:
# cvcrm_sync_logs: contagem > 0
# cvcrm_sync_cursors: contagem > 0
# sync_logs: contagem = anterior (não deletados ainda)
# sync_cursors: contagem = anterior (não deletados ainda)
```

### 5.4 Validar aplicação

```bash
# Verificar se sincronização funciona
pnpm test

# Se houver erros de sincronização, revisar migration
```

### 5.5 Deletar tabelas antigas (manual)

Após validação:

```bash
# LOCAL
psql -U pratica -d pratica << 'EOF'
DROP TABLE IF EXISTS sync_logs CASCADE;
DROP TABLE IF EXISTS sync_cursors CASCADE;
EOF

# VPS
ssh root@185.182.184.122 "psql -U pratica -d pratica << 'EOF'
DROP TABLE IF EXISTS sync_logs CASCADE;
DROP TABLE IF EXISTS sync_cursors CASCADE;
EOF
"
```

### ✅ Milestone 3 Concluído
- [x] Migration 042 executada
- [x] Dados consolidados
- [x] Tabelas antigas deletadas
- [x] Nenhuma duplicação restante

---

## 🧪 Passo 6: Testes de Integridade

### 6.1 Criar arquivo de testes

Arquivo: `__tests__/database/phase1-integrity.test.ts`

```typescript
import { db } from '@/lib/db';

describe('Phase 1: Database Integrity', () => {
  describe('Foreign Keys', () => {
    it('should have 40+ foreign keys', async () => {
      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE 'fk_%'
      `);
      expect(parseInt(result.rows[0].count)).toBeGreaterThanOrEqual(40);
    });
  });

  describe('tenant_id Removal', () => {
    it('should have no tenant_id columns', async () => {
      const result = await db.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE column_name = 'tenant_id'
        AND table_schema = 'public'
      `);
      expect(parseInt(result.rows[0].count)).toBe(0);
    });

    it('should have removed tenants table', async () => {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'tenants'
        ) as exists
      `);
      expect(result.rows[0].exists).toBe(false);
    });
  });

  describe('workspace_id Completeness', () => {
    it('should have workspace_id in all critical tables', async () => {
      const tables = [
        'cvcrm_leads',
        'whatsapp_messages',
        'eventos',
        'comissao_vendas'
      ];

      for (const table of tables) {
        const result = await db.query(
          `SELECT COUNT(*) as count FROM ${table} WHERE workspace_id IS NULL`
        );
        expect(parseInt(result.rows[0].count)).toBe(0);
      }
    });
  });

  describe('No Orphan Records', () => {
    it('should have no orphan cvcrm_leads', async () => {
      const result = await db.query(`
        SELECT COUNT(*) as count FROM cvcrm_leads
        WHERE workspace_id NOT IN (SELECT id FROM workspaces)
      `);
      expect(parseInt(result.rows[0].count)).toBe(0);
    });
  });
});
```

### 6.2 Rodar testes

```bash
# Executar testes de integridade
pnpm test __tests__/database/phase1-integrity.test.ts

# Esperado: ✅ Todos passam
```

---

## 📊 Passo 7: Deploy em Staging

### 7.1 Preparar branch para PR

```bash
git add migrations/040_add_foreign_keys.sql
git add migrations/041_remove_tenant_id.sql
git add migrations/042_consolidate_duplicates.sql
git add docs/database/STANDARDIZATION_PLAN.md
git add docs/database/PHASE1_IMPLEMENTATION.md
git add __tests__/database/phase1-integrity.test.ts
git add -A  # Código TypeScript atualizado

git commit -m "feat: database standardization phase 1 - integrity fixes

- Migration 040: Add 40+ foreign key constraints
- Migration 041: Remove deprecated tenant_id column from 150+ tables
- Migration 042: Consolidate duplicate sync tables
- Update TypeScript code to use workspace_id instead of tenant_id
- Add database integrity tests
- Add comprehensive documentation

Breaking changes:
- All queries must use workspace_id (not tenant_id)
- Removed tenants table (use workspaces instead)

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

### 7.2 Push e criar PR

```bash
git push origin feat/database-standardization

# Criar PR manualmente ou com gh
gh pr create --title "feat: database standardization phase 1" \
  --body "See PHASE1_IMPLEMENTATION.md for details"
```

### 7.3 CI/CD Pipeline

Esperar por:
- [x] Linter pass
- [x] Type check pass
- [x] Tests pass
- [x] Build success

### 7.4 Deploy em staging

```bash
# Após PR aprovada, fazer deploy em staging
# (Configuração específica do seu CI/CD)

# Rodar migrations em staging
ssh staging-user@staging-host "cd /app && pnpm migrate"

# Rodar testes E2E em staging
ssh staging-user@staging-host "cd /app && pnpm test:e2e"
```

### 7.5 Validação em staging

```bash
# Testar fluxos críticos
# 1. Criar lead em staging
# 2. Criar evento em staging
# 3. Enviar mensagem WhatsApp em staging
# 4. Calcular comissão em staging

# Validar logs
ssh staging-user@staging-host "tail -100f /app/logs/*.log"

# Procurar por erros de FK ou workspace_id
grep -i "foreign key\|workspace_id\|tenant_id" /app/logs/*.log
```

---

## 📊 Passo 8: Deploy em Produção

### 8.1 Cronograma

**Janela recomendada**: Quinta-feira à noite (menos ativo)
**Duração estimada**: 30 minutos
**Rollback disponível**: Sim (backup pré-migration)

### 8.2 Checklist pré-deployment

- [ ] Backup completo feito em T-1 hora
- [ ] Staging validado por 24+ horas
- [ ] Plano de rollback documentado
- [ ] Monitoramento ativado
- [ ] Equipe on-call disponível
- [ ] Comunicado enviado a usuários

### 8.3 Procedure de deployment

```bash
# 1. Fazer backup
ssh root@185.182.184.122 "pg_dump -U pratica pratica > /backups/backup_before_phase1_$(date +%Y%m%d_%H%M%S).sql"

# 2. Merge PR em main
git checkout main
git pull origin main
git merge feat/database-standardization

# 3. Build e deploy
ssh root@185.182.184.122 "cd /var/www/pratica && git pull origin main && pnpm build"

# 4. Rodar migrations
ssh root@185.182.184.122 "psql -U pratica -d pratica" < migrations/040_add_foreign_keys.sql
ssh root@185.182.184.122 "psql -U pratica -d pratica" < migrations/041_remove_tenant_id.sql
ssh root@185.182.184.122 "psql -U pratica -d pratica" < migrations/042_consolidate_duplicates.sql

# 5. Restart aplicação
ssh root@185.182.184.122 "pm2 restart pratica"

# 6. Verificar status
ssh root@185.182.184.122 "pm2 status"
ssh root@185.182.184.122 "pm2 logs pratica --lines 50"
```

### 8.4 Monitoramento pós-deployment

```bash
# Verificar erros nos logs
ssh root@185.182.184.122 "pm2 logs pratica" | grep -i "error\|exception"

# Monitorar performance
ssh root@185.182.184.122 "htop"
ssh root@185.182.184.122 "psql -U pratica -d pratica -c 'SELECT * FROM pg_stat_statements LIMIT 10;'"

# Verificar que workspace_id está sendo usado
curl -X GET https://api.pratica.com/api/health
# Esperado: 200 OK

# Testar lead creation
curl -X POST https://api.pratica.com/api/leads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome": "Test", "telefone": "11999999999"}'
```

### 8.5 Rollback (se necessário)

```bash
# Se algo der errado:

# 1. Restore backup
ssh root@185.182.184.122 "psql -U pratica -d pratica < /backups/backup_before_phase1.sql"

# 2. Revert código
git revert HEAD~1

# 3. Rebuild e restart
ssh root@185.182.184.122 "cd /var/www/pratica && git pull && pnpm build && pm2 restart pratica"

# 4. Comunicar a equipe
# Email: "Phase 1 rollback completed, investigating root cause"
```

---

## ✅ Fase 1 Completa!

### Resumo de Mudanças

| Aspecto | Antes | Depois |
|--------|-------|--------|
| Foreign Keys | ~5 | 45+ |
| tenant_id | Presente em 150+ tabelas | ❌ Removido |
| Tabelas duplicadas | 3 (sync_logs, sync_cursors) | Consolidadas |
| Código | Usa tenant_id | Usa workspace_id |
| Integridade | Fraca (orphan records possíveis) | Forte (FKs garantem) |

### Próximos Passos

1. ✅ Phase 1 completa
2. 🔄 Próximo: Phase 2 (Normalizar JSONB)
3. 📅 Schedule: Sprint 3-4 (2 semanas depois)

---

## 📞 Suporte

**Problemas?**
- Verificar `/var/www/pratica/logs/` em produção
- Consultar documento CLAUDE.md para configurações
- Contact: DevOps team ou Database administrator

---

**Data**: Fevereiro 5, 2026
**Status**: ✅ Pronto para execução
**Próximo Check-in**: Após Phase 1 completa (Semana 2)
