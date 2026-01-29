# Teste de Integração Completa - Sofia + CRM + Salva-Leads

## Fluxo de Teste End-to-End

### 1️⃣ TESTE SOFIA VENDEDOR
**Ação:** Cliente envia mensagem ao WhatsApp
```
Cliente: "Quero 2Q até 500k na Zona Sul"
```

**Esperado:**
- ✅ Sofia detecta intenção de compra (categoria VENDA_IMOVEL)
- ✅ Busca imóveis no CV CRM com filtros (2 quartos, até R$ 500k)
- ✅ Oferece 3 imóveis principais
- ✅ Envia botões "Agendar Visita" / "Mais Detalhes"

**Verificar no código:**
- `flows.ts` - `processMessage()` com detecção de `VENDA_IMOVEL`
- `fluxo-vendedor.ts` - `iniciarFluxoVendaImovel()`
- `vendedor-imovel.ts` - `detectarIntencaoCompra()`

---

### 2️⃣ TESTE CRIAÇÃO DE LEAD
**Ação:** Cliente clica em "Agendar Visita"

**Esperado:**
- ✅ POST `/api/salva-leads/novo-lead` cria lead no banco
- ✅ Lead recebe score automático (quartos + preço + contato)
- ✅ Se score >= 7: Marca como qualificado
- ✅ Se qualificado: Envia notificação WhatsApp ao corretor

**Verificar:**
```bash
curl -X POST http://localhost:3000/api/salva-leads/novo-lead \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva",
    "whatsapp": "11999999999",
    "imovel_id": "12345",
    "imovel_nome": "Apto Vila Mariana",
    "imovel_preco": 450000,
    "filtros": {"quartos": 2, "bairro": "Zona Sul"},
    "tenant_id": 1,
    "source": "whatsapp_sofia"
  }'
```

**Esperado na resposta:**
```json
{
  "success": true,
  "lead": {
    "id": "uuid-lead",
    "nome": "João Silva",
    "score": 7.5,
    "qualificado": true,
    "status": "novo"
  }
}
```

---

### 3️⃣ TESTE LISTAGEM DE LEADS (CRM)
**Ação:** Corretor acessa o CRM em `/corretor/salva-leads`

**Esperado:**
- ✅ GET `/api/salva-leads/leads?tenant_id=1` retorna lista de leads
- ✅ Leads aparecem ordenados por score (DESC)
- ✅ Exibe score, status, nome, contato

**Verificar:**
```bash
curl "http://localhost:3000/api/salva-leads/leads?tenant_id=1&limit=10"
```

**Esperado:**
```json
{
  "success": true,
  "leads": [
    {
      "id": "uuid-lead",
      "nome": "João Silva",
      "whatsapp": "11999999999",
      "score": 7.5,
      "qualificado": true,
      "status": "novo",
      "interactions": 2,
      "createdAt": "2025-01-28T..."
    }
  ],
  "pagination": { "total": 1, "limit": 10, "pages": 1 }
}
```

---

### 4️⃣ TESTE AGENDAMENTO DE VISITA
**Ação:** Corretor clica "Agendar Visita" no CRM

**Esperado:**
- ✅ POST `/api/salva-leads/agendar-visita` cria agendamento
- ✅ Notifica cliente via WhatsApp com data/hora
- ✅ Notifica corretor no WhatsApp
- ✅ Atualiza status do lead para "agendado"

**Verificar:**
```bash
curl -X POST http://localhost:3000/api/salva-leads/agendar-visita \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "uuid-lead",
    "data_visita": "2025-01-29T14:00:00Z",
    "horario": "14:00",
    "observacoes": "Levar documentação",
    "tenant_id": 1
  }'
```

**Esperado:**
```json
{
  "success": true,
  "agendamento": {
    "id": "uuid-visit",
    "lead_id": "uuid-lead",
    "scheduled_date": "2025-01-29T14:00:00Z",
    "status": "agendada",
    "notificacoes_enviadas": true
  }
}
```

---

### 5️⃣ TESTE SINCRONIZAÇÃO COM CV CRM
**Verificar:**
- ✅ Lead foi criado no CV CRM (verificar em `leads_interactions`)
- ✅ Status sincronizado automaticamente
- ✅ Visita registrada no CV CRM

**No banco:**
```sql
SELECT * FROM leads WHERE tenant_id = 1 ORDER BY created_at DESC LIMIT 5;
SELECT * FROM leads_visits WHERE status = 'agendada' LIMIT 5;
SELECT * FROM leads_interactions WHERE tipo = 'agendamento_visita' LIMIT 5;
```

---

### 6️⃣ TESTE FOLLOW-UP AUTOMÁTICO
**Esperado:**
- ✅ Lead sem interações por 4h recebe primeira mensagem follow-up
- ✅ Sem interações por 24h recebe segunda mensagem
- ✅ Sem interações por 3 dias recebe terceira mensagem

**Verificar (manual):**
```bash
# Executar job de follow-up
curl -X POST http://localhost:3000/api/cron/salva-leads \
  -H "X-Cron-Token: seu-token"
```

---

## Checklist de Implementação

### PASSO 1: Sofia Vendedor ✅
- ✅ Importação de `fluxo-vendedor.ts` em `flows.ts`
- ✅ Detecção de `VENDA_IMOVEL` no `processMessage()`
- ✅ Integração com `detectarIntencaoCompra()`
- ✅ Adição de categoria `VENDA_IMOVEL` em `intents.ts`

### PASSO 2: CRM Corretor ✅
- ✅ Rota `/corretor/salva-leads` já existe
- ✅ Componentes React já implementados
- ✅ Conectar ao backend real (endpoints criados)

### PASSO 3: Salva-Leads Backend ✅
- ✅ POST `/api/salva-leads/novo-lead` criado
- ✅ GET `/api/salva-leads/leads` criado
- ✅ POST `/api/salva-leads/agendar-visita` criado
- ✅ `lead-scoring.ts` com cálculo de score
- ✅ `crm-sync.ts` para sincronizar com CV CRM
- ✅ `follow-up-automation.ts` para automação

### PASSO 4: Database Schema ✅
- ✅ Migrations SQL em `/lib/migrations/salva-leads-schema.sql`
- ✅ Tabelas: leads, leads_interactions, leads_visits, leads_followups

### PASSO 5: Build & Deploy 🔄
- [ ] `npm run build` - verificar zero erros
- [ ] `git add -A && git commit`
- [ ] `git push scalingo main`
- [ ] Testar em `https://pratica.osc-fr1.scalingo.io/corretor`

---

## Comandos úteis

### Testar localmente
```bash
cd /Users/saraiva/_Projetos/appnovo_pratica
npm run dev
# Acessar http://localhost:3000/corretor
```

### Deploy
```bash
cd /Users/saraiva/_Projetos/appnovo_pratica
git add -A
git commit -m "feat: integração completa sofia+crm+salva-leads"
git push scalingo main
```

### Verificar logs
```bash
scalingo logs -e production
```

---

## Erros Comuns & Soluções

**Erro: "leads table not found"**
→ Execute as migrations SQL no banco

**Erro: "CVCRM_API_KEY not set"**
→ Configure as variáveis de ambiente no `.env`

**Erro: "WhatsApp message failed"**
→ Verificar se `ZAPI_AUTH_TOKEN` está configurado

---

## Performance Esperada

- Detecção de venda: < 100ms
- Cálculo de score: < 50ms  
- Envio de notificações: < 500ms
- Agendamento: < 200ms
- Follow-up batch: < 5000ms (50 leads)

---

## Próximos Passos Após Deploy

1. Testar fluxo completo em produção
2. Monitorar erros em logs
3. Calibrar scores e thresholds baseado em conversões
4. Implementar A/B testing de mensagens
5. Adicionar analytics e reporting
