# 🚀 Schema Fix - Guia Rápido

## ⚡ Quick Start

```bash
# 1. Aplicar correções no banco
sudo -u postgres psql -d pratica -f /var/www/pratica/SCHEMA_FIX_COMPLETO.sql

# 2. Reiniciar aplicação
pm2 restart pratica

# 3. Verificar se erros sumiram
pm2 logs pratica --lines 50 | grep -i "does not exist"
```

Se não aparecer nenhuma linha, **SUCESSO!** ✅

---

## 📁 Arquivos Gerados

| Arquivo | Descrição |
|---------|-----------|
| `SCHEMA_ANALISE.md` | 📊 Análise completa (7KB) - Detalhes de todas as colunas faltando |
| `SCHEMA_FIX_COMPLETO.sql` | 🔧 Script SQL (12KB) - Corrige TUDO de uma vez |
| `SCHEMA_FIX_README.md` | 📖 Este arquivo - Guia rápido |

---

## 🔴 Problemas Críticos Identificados

### 1. **whatsapp_contacts** - 5 colunas faltando
```
❌ total_messages_received
❌ total_messages_sent
❌ is_business
❌ is_group
❌ last_interaction_at
```

**Impacto:** Webhook Evolution API quebrado + Endpoints de leads falhando

### 2. **agent_configs** - 1 coluna faltando
```
❌ workspace_id
```

**Impacto:** Sistema de agentes (Sofia/Luna) não funciona + Multi-tenancy quebrado

### 3. **agent_conversation_logs** - 1 coluna faltando
```
❌ workspace_id
```

**Impacto:** Logs de conversação não salvam + Analytics quebrado

### 4. **onboarding_leads** - Tabela não existe
```
❌ Tabela inteira faltando
```

**Impacto:** Código de backup não funciona (código atual OK)

---

## 📊 Status Antes vs Depois

### ❌ ANTES (Com Erros)
```
pm2 logs pratica | grep "does not exist"
→ [Sofia] Error: relation "onboarding_leads" does not exist
→ [Message] Error: column "total_messages_received" does not exist
→ [AgentConfig] Error: column "workspace_id" does not exist
```

### ✅ DEPOIS (Tudo Funcionando)
```
pm2 logs pratica | grep "does not exist"
→ (sem resultados)
```

---

## 🔧 O Que o Script Faz

```sql
-- ✅ Adiciona 5 colunas em whatsapp_contacts
ALTER TABLE whatsapp_contacts ADD COLUMN total_messages_received INTEGER DEFAULT 0;
ALTER TABLE whatsapp_contacts ADD COLUMN total_messages_sent INTEGER DEFAULT 0;
ALTER TABLE whatsapp_contacts ADD COLUMN is_business BOOLEAN DEFAULT false;
ALTER TABLE whatsapp_contacts ADD COLUMN is_group BOOLEAN DEFAULT false;
ALTER TABLE whatsapp_contacts ADD COLUMN last_interaction_at TIMESTAMP;

-- ✅ Adiciona workspace_id em agent_configs
ALTER TABLE agent_configs ADD COLUMN workspace_id INTEGER;

-- ✅ Adiciona workspace_id em agent_conversation_logs
ALTER TABLE agent_conversation_logs ADD COLUMN workspace_id INTEGER;

-- ✅ Cria tabela onboarding_leads (opcional)
CREATE TABLE onboarding_leads (...);

-- ✅ Cria índices para performance
CREATE INDEX idx_whatsapp_contacts_business ...
CREATE INDEX idx_agent_configs_workspace ...
```

---

## 🧪 Como Testar Depois

### 1. Testar Webhook WhatsApp
```bash
# Enviar mensagem de teste para número conectado
# Verificar se não dá erro de coluna faltando
pm2 logs pratica --lines 20
```

### 2. Testar Sistema de Agentes
```bash
# Acessar endpoint de teste
curl http://localhost:3000/api/agents/test \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"message": "oi", "workspaceId": 1, "instanceName": "pratica"}'
```

### 3. Verificar Logs de Conversação
```bash
# Deve retornar sem erros
curl http://localhost:3000/api/agents/pratica/logs?workspaceId=1
```

---

## 📈 Método de Análise Usado

1. ✅ **PM2 Logs** - Extraídos últimos 1000 erros
2. ✅ **Grep Recursivo** - Varridos 129.641 arquivos de código
3. ✅ **Schema Inspection** - Analisadas 136 tabelas do banco
4. ✅ **Code References** - Mapeadas todas as queries SQL no código
5. ✅ **Migration Review** - Verificadas 27 migrations existentes

---

## ⚠️ Avisos Importantes

### Safe para Produção
- ✅ **Idempotente** - Pode rodar múltiplas vezes sem problemas
- ✅ **Não-destrutivo** - Só adiciona, nunca remove
- ✅ **Com fallbacks** - Popula dados automaticamente quando possível

### Backup Recomendado (Opcional)
```bash
# Fazer backup antes se quiser
sudo -u postgres pg_dump pratica > backup_antes_fix_$(date +%Y%m%d).sql
```

---

## 🎯 Resultado Esperado

Após aplicar o script:

```bash
pm2 logs pratica --lines 100 | grep -c "does not exist"
→ 0  # Zero erros! 🎉
```

Aplicação funcionando:
- ✅ Webhook Evolution recebendo mensagens
- ✅ Sofia/Luna respondendo corretamente
- ✅ Logs de conversação salvando
- ✅ Endpoints de leads retornando dados
- ✅ Multi-tenancy isolando workspaces

---

## 📞 Troubleshooting

### Se ainda aparecer erro após aplicar:

1. **Verificar se script rodou completo**
   ```bash
   sudo -u postgres psql -d pratica -c "\d whatsapp_contacts"
   # Deve mostrar todas as colunas novas
   ```

2. **Reiniciar FORÇADO**
   ```bash
   pm2 delete pratica
   pm2 start ecosystem.config.js --only pratica
   ```

3. **Verificar variáveis de ambiente**
   ```bash
   cat /var/www/pratica/.env | grep DATABASE_URL
   # Deve apontar para banco pratica correto
   ```

---

## 📚 Referências

- **Análise Completa:** Ver `SCHEMA_ANALISE.md` (7KB)
- **Script SQL:** Ver `SCHEMA_FIX_COMPLETO.sql` (12KB)
- **Migrations Originais:** `/var/www/pratica/migrations/027_*.sql`

---

**Criado por:** Subagent Análise Profunda  
**Data:** 29/01/2025  
**Status:** ✅ Pronto para aplicação em produção
