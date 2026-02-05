# ✅ Implementation Checklist - Database Standardization

## Phase 1: Correções Críticas de Integridade

### Pre-Execution (T-1 Day)
- [ ] Tech lead aprovou plano
- [ ] Backup completo do banco produção feito
- [ ] Branch criado: `feat/database-standardization`
- [ ] Staging ambiente ready
- [ ] Equipe notificada

### Execution Day 1: Migration 040 (Foreign Keys)

#### Morning (08:00-12:00)
- [ ] SQL review: `migrations/040_add_foreign_keys.sql`
- [ ] Executar em LOCAL (dev environment)
  ```bash
  psql -U pratica -d pratica < migrations/040_add_foreign_keys.sql
  ```
- [ ] Validar sucesso:
  ```sql
  SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY' AND constraint_name LIKE 'fk_%';
  -- Esperado: 40+
  ```
- [ ] Testar queries críticas:
  ```bash
  pnpm test
  ```

#### Afternoon (13:00-17:00)
- [ ] Executar em STAGING
  ```bash
  ssh staging "psql -U pratica -d pratica < migrations/040_add_foreign_keys.sql"
  ```
- [ ] Validar aplicação em staging
- [ ] Rodar E2E tests
- [ ] Verificar logs por erros

#### Evening (17:00-EOD)
- [ ] Documentar resultado
- [ ] Commit changes se sucesso
- [ ] Preparar para Migration 041

### Execution Day 2: Migration 041 (Remove tenant_id)

#### Morning (08:00-12:00)
- [ ] SQL review: `migrations/041_remove_tenant_id.sql`
- [ ] Validar que workspace_id está 100% preenchido:
  ```sql
  SELECT COUNT(*) FROM cvcrm_leads WHERE workspace_id IS NULL;
  -- Esperado: 0
  ```
- [ ] Fazer lista de arquivos TypeScript com `tenant_id`:
  ```bash
  grep -r "tenant_id" app/ lib/ --include="*.ts" | wc -l
  ```
- [ ] Executar migration em LOCAL
  ```bash
  psql -U pratica -d pratica < migrations/041_remove_tenant_id.sql
  ```

#### Afternoon (13:00-17:00)
- [ ] Começar refatoração de código TypeScript
  - [ ] `lib/db.ts` - remover referências
  - [ ] `lib/api-auth.ts` - usar workspace_id
  - [ ] `app/api/**/*.ts` - atualizar queries
  - [ ] `lib/**/*.ts` - verificar imports
- [ ] Executar testes durante refatoração
- [ ] Grep para certificar zero `tenant_id`:
  ```bash
  grep -r "tenant_id" app/ lib/ | wc -l
  # Esperado: 0
  ```

#### Evening (17:00-EOD)
- [ ] Executar em STAGING
- [ ] Validar aplicação staging
- [ ] Rodar todos os testes
- [ ] Documentar mudanças

### Execution Day 3: Migration 042 (Consolidate Duplicates)

#### Morning (08:00-12:00)
- [ ] SQL review: `migrations/042_consolidate_duplicates.sql`
- [ ] Verificar estrutura de tabelas antigas:
  ```bash
  psql -U pratica -d pratica -c "\d sync_logs"
  psql -U pratica -d pratica -c "\d sync_cursors"
  ```
- [ ] Contar registros em cada tabela
- [ ] Executar migration em LOCAL
- [ ] Validar que dados foram consolidados

#### Afternoon (13:00-17:00)
- [ ] Executar em STAGING
- [ ] Testar sincronização (se houver)
- [ ] Verificar aplicação comportamento
- [ ] Deletar tabelas antigas em staging:
  ```sql
  DROP TABLE IF EXISTS sync_logs CASCADE;
  DROP TABLE IF EXISTS sync_cursors CASCADE;
  ```

#### Evening (17:00-EOD)
- [ ] Documentar consolidação
- [ ] Preparar para deploy em produção

### Post-Execution: Validação & Deploy

#### Staging Validation (24-48 horas)
- [ ] Foreign Keys funcionam (sem erros de integridade)
- [ ] Queries não quebradas
- [ ] Performance não degradada
- [ ] Aplicação roda sem erros
- [ ] Testes E2E 100% pass
- [ ] Logs clean (sem warnings)
- [ ] Performance metrics aceitáveis

#### Production Deployment

##### Pre-Deploy Checklist
- [ ] Janela de manutenção scheduled (quinta 22h-sexta 06h recomendado)
- [ ] Backup produção feito (T-1 hora)
- [ ] Equipe notificada
- [ ] Rollback plan documentado
- [ ] Monitoramento setup (logs, metrics)

##### Deploy Execution
- [ ] Backup verificado
- [ ] Migration 040 executada
  ```bash
  ssh prod "psql -U pratica -d pratica < migrations/040_add_foreign_keys.sql"
  ```
- [ ] Validar: query count > 40
- [ ] Migration 041 executada
  ```bash
  ssh prod "psql -U pratica -d pratica < migrations/041_remove_tenant_id.sql"
  ```
- [ ] Validar: no tenant_id columns
- [ ] Migration 042 executada
  ```bash
  ssh prod "psql -U pratica -d pratica < migrations/042_consolidate_duplicates.sql"
  ```
- [ ] Deletar tabelas antigas
- [ ] Aplicação restart
  ```bash
  ssh prod "pm2 restart pratica"
  ```
- [ ] Health check
  ```bash
  curl https://api.pratica.com/health
  # Esperado: 200 OK
  ```

##### Post-Deploy Validation (24 horas)
- [ ] Logs clean (grep for errors)
- [ ] Performance OK (não 10x+ lento)
- [ ] Usuarios conseguem usar sistema
- [ ] Queries críticas funcionam
- [ ] Database integrity OK
- [ ] 0 erros de foreign key

##### Finalize
- [ ] PR merged para main
- [ ] Commit messages com context
- [ ] Documentação atualizada
- [ ] Equipe comunicada (success notification)
- [ ] Scheduled retrospective

### If Issues Occur

#### Issue: FK Constraint Failed
- [ ] Identificar que constraint falhou
- [ ] Verificar orphan records
- [ ] Cleanup orphans (SET NULL ou DELETE)
- [ ] Rerun migration
- [ ] Se persistir: ROLLBACK

#### Issue: Aplicação quebrada
- [ ] Verificar logs exatos
- [ ] Se código: hot-fix + redeploy
- [ ] Se schema: ROLLBACK + investigar
- [ ] Testar fix em staging antes de redeploy

#### Issue: Performance degradada
- [ ] ANALYZE database
  ```sql
  ANALYZE;
  ```
- [ ] Verificar índices foram criados
- [ ] Se falta índices: criar
- [ ] Se persistir: ROLLBACK + investigar

#### ROLLBACK Procedure
1. Restore backup
   ```bash
   ssh prod "psql -U pratica -d pratica < backup_before_phase1.sql"
   ```
2. Revert código changes
   ```bash
   git revert HEAD~1
   git push
   ```
3. Restart aplicação
   ```bash
   ssh prod "pm2 restart pratica"
   ```
4. Verificar status
5. Post-mortem investigation

---

## Phase 2-5 (Future)

### Phase 2 (Sprint 3-4): Normalização de Dados
- [ ] Migrations 043, 044, 045 executadas em staging
- [ ] JSONB data migrado para tabelas
- [ ] Queries atualizadas para usar joins
- [ ] Testes passam
- [ ] Deploy produção

### Phase 3 (Sprint 5-8): Padronização de Nomenclatura ⚠️ BREAKING
- [ ] Migration 046 executada (renomear colunas)
- [ ] 100% código TypeScript refatorado
- [ ] Testes E2E 7+ dias sem falhas
- [ ] Deploy em janela de manutenção

### Phase 4 (Sprint 9-10): Performance
- [ ] Migration 048 executada (índices compostos)
- [ ] Migration 049 executada (RLS)
- [ ] Queries 10x+ mais rápidas
- [ ] Integridade RLS validada
- [ ] Deploy produção

### Phase 5 (Sprint 11-12): Documentação
- [ ] ERDs gerados e salvos
- [ ] Convenções finalizadas
- [ ] Testes de integridade criados
- [ ] Tipos TypeScript sincronizados
- [ ] Documentação publicada

---

## Daily Status Report Template

```
Date: YYYY-MM-DD
Phase: 1
Task: Migration 040

Completed:
- [ ] Morning: SQL review + local test
- [ ] Afternoon: Staging execution
- [ ] Evening: Validation

Issues:
- None / [Describe if any]

Performance:
- Migration duration: X minutes
- Queries affected: Y
- New FKs: Z

Next: [Describe next steps]

Sign-off: [Name] ✓
```

---

## Success Criteria - Phase 1

**Green Light** when:
- [x] 40+ FKs adicionadas (verificável em banco)
- [x] tenant_id removido de 150+ tabelas (grep returns 0)
- [x] Tabelas duplicadas consolidadas
- [x] Código TypeScript atualizado (no tenant_id references)
- [x] Testes unitários passam
- [x] Testes E2E passam
- [x] Production deployment sucesso
- [x] 48 horas validação em produção sem issues

---

## Timeline

| Dia | Sprint | Atividade | Tempo |
|-----|--------|-----------|-------|
| Segunda | 1 | Migration 040 | 4h |
| Terça | 1 | Migration 041 | 6h |
| Quarta | 1 | Migration 042 | 2h |
| Quinta | 1 | Staging validation | 8h |
| Sexta | 2 | Deploy produção | 4h |
| Semana 2 | 2 | Monitoring + finalize | 16h |

**Total**: ~40 horas = 1 semana de trabalho focado

---

## Notes

- Todas as migrações usam `IF EXISTS` para ser idempotent
- Cada migration pode ser executada múltiplas vezes com segurança
- Backups são críticos - fazer antes de CADA migration
- Testes devem passar 100% antes de avançar
- Comunicar progresso à equipe diariamente

---

**Last Updated**: Fevereiro 5, 2026
**Status**: Pronto para execução
**Next Review**: Após Phase 1 completa
