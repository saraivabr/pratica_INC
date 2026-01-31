# Guia de Testes Locais - Sofia + CRM + Salva-Leads

## Configuração do Ambiente Local

### 1. Preparação do Banco de Dados

Antes de tudo, você precisa das tabelas criadas. Execute:

```bash
# Conectar ao banco local
psql YOUR_DATABASE_URL < lib/migrations/salva-leads-schema.sql

# Ou manualmente:
psql -h localhost -U postgres -d seu_banco
\i /path/to/lib/migrations/salva-leads-schema.sql
```

### 2. Variáveis de Ambiente

Adicione ao `.env.local`:

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/appnovo_pratica"

# Sofia - WhatsApp API (ZAPI)
ZAPI_AUTH_TOKEN="seu_token_zapi"
ZAPI_INSTANCE_ID="sua_instancia"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# OpenAI (para Sofia IA)
OPENAI_API_KEY="sk-..."

# CV CRM Integration
CVCRM_API_URL="https://seu-cvcrm.com/api"
CVCRM_API_KEY="sua-chave-cv-crm"
CVCRM_IMOBILIARIA_ID="1234"

# Tenant (para multi-tenant)
DEFAULT_TENANT_ID="1"
```

### 3. Iniciar o Servidor Local

```bash
cd /Users/saraiva/_Projetos/appnovo_pratica
npm install  # Se necessário
npm run dev
```

Acesse `http://localhost:3000`

---

## Testes Passo a Passo

### TESTE 1: Sofia Vendedor (Detecção de Venda)

**Objetivo:** Verificar se Sofia detecta intenção de compra

```bash
# 1. Abra um terminal/Dev Tools do navegador
# 2. Vá para /corretor (para ter um usuário autenticado)
# 3. Simule uma mensagem para Sofia:

curl -X POST http://localhost:3000/api/sofia/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer seu-token" \
  -d '{
    "telefone": "11999999999",
    "mensagem": "Quero 2Q até 500k na Zona Sul",
    "nome_cliente": "João Silva"
  }'
```

**Esperado:**
```json
{
  "success": true,
  "mensagens": [
    "João Silva! Encontrei 3 imóveis INCRÍVEL que batem com sua busca! 🔥",
    ...
  ],
  "botoes": [...]
}
```

### TESTE 2: Criar Lead com Score

```bash
curl -X POST http://localhost:3000/api/salva-leads/novo-lead \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva",
    "whatsapp": "11999999999",
    "imovel_id": "emp_123",
    "imovel_nome": "Apto Vila Mariana - 2Q",
    "imovel_preco": 450000,
    "filtros": {
      "quartos": 2,
      "precoMax": 500000,
      "bairro": ["Zona Sul"]
    },
    "tenant_id": 1,
    "source": "whatsapp_sofia"
  }'
```

**Esperado:**
```json
{
  "success": true,
  "lead": {
    "id": "4b5a6c7d-...",
    "nome": "João Silva",
    "score": 7.5,
    "qualificado": true,
    "status": "novo",
    "created_at": "2025-01-28T10:30:00Z"
  }
}
```

**Verificar no banco:**
```sql
SELECT * FROM leads WHERE nome = 'João Silva';
SELECT * FROM leads_interactions WHERE lead_id = '4b5a6c7d-...';
```

### TESTE 3: Listar Leads no CRM

```bash
curl "http://localhost:3000/api/salva-leads/leads?tenant_id=1&limit=10&sort=score%20DESC"
```

**Esperado:**
- Lead aparece com score 7.5
- Ordenado por score descendente
- Conta de interações

### TESTE 4: Agendar Visita

```bash
curl -X POST http://localhost:3000/api/salva-leads/agendar-visita \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "4b5a6c7d-...",
    "data_visita": "2025-01-30T14:00:00Z",
    "horario": "14:00",
    "observacoes": "Trazer documentação",
    "tenant_id": 1
  }'
```

**Esperado:**
```json
{
  "success": true,
  "agendamento": {
    "id": "visit-uuid-...",
    "scheduled_date": "2025-01-30T14:00:00Z",
    "status": "agendada",
    "notificacoes_enviadas": true
  }
}
```

**Verificar no banco:**
```sql
SELECT * FROM leads_visits WHERE status = 'agendada';
SELECT * FROM leads_interactions WHERE tipo = 'agendamento_visita';
```

---

## Testes Manual via UI

### Testar no CRM Corretor

1. **Acesse:** http://localhost:3000/corretor
2. **Navegue para:** Salva-Leads (no menu lateral)
3. **Veja:** Lista de leads com scores
4. **Clique em:** Agendar Visita
5. **Esperado:** 
   - Modal abre para escolher data/hora
   - Após confirmar, notificações enviadas (verificar logs)
   - Lead atualiza para status "agendado"

---

## Verificações de Logs

### Ver logs do Next.js
```bash
# Terminal 1 (já rodando npm run dev)
# Procure por linhas como:
# [Sofia] Intenção de venda detectada
# [Novo-Lead] Lead criado
# [CV CRM Sync] ...
```

### Ver logs do banco
```sql
-- Últimos leads criados
SELECT id, nome, score, status, created_at FROM leads ORDER BY created_at DESC LIMIT 10;

-- Interações de um lead
SELECT * FROM leads_interactions WHERE lead_id = 'uuid-do-lead' ORDER BY created_at DESC;

-- Visitas agendadas
SELECT * FROM leads_visits WHERE status = 'agendada';
```

---

## Debug e Troubleshooting

### Erro: "ZAPI not configured"
→ Verifique `.env.local` tem `ZAPI_AUTH_TOKEN`

### Erro: "Lead não encontrado"
→ Verifique se `lead_id` existe no banco:
```sql
SELECT * FROM leads WHERE id = '...';
```

### Score sempre 0
→ Verifique `lib/salva-leads/lead-scoring.ts` está importado corretamente

### Notificações não sendo enviadas
→ Verificar token ZAPI em logs:
```
[Sofia] sendTextMessage Error: ...
```

### Build falha
→ Rodar `npm run build` localmente para debug
```bash
npm run build 2>&1 | grep -A5 "error"
```

---

## Performance Esperada (Local)

| Operação | Tempo Esperado |
|----------|------|
| Detectar venda | < 50ms |
| Calcular score | < 10ms |
| Criar lead | < 100ms |
| Listar leads (10) | < 50ms |
| Agendar visita | < 200ms |
| Enviar notificação | < 500ms |

---

## Reproduzindo o Fluxo Completo

### Cenário: Cliente compra imóvel via Sofia

```
1. Cliente: "Quero 2Q até 500k na Zona Sul"
   ↓
2. Sofia: Detecta VENDA_IMOVEL → busca imóveis → oferece
   ↓
3. Cliente: Clica "Agendar Visita"
   ↓
4. Sistema: Cria LEAD com score automático
   ↓
5. Se qualificado: Notifica corretor no WhatsApp
   ↓
6. Corretor: Acessa CRM → vê lead
   ↓
7. Corretor: Clica "Agendar"
   ↓
8. Sistema: Cria VISITA → notifica cliente
   ↓
9. Cliente: Recebe confirmação de visita
   ↓
10. Corretor: Executa visita → marca como realizada
```

**Para testar tudo:**

1. Criar 3-5 leads via API POST
2. Listar em `/corretor/salva-leads`
3. Agendar 2-3 visitas
4. Verificar banco de dados
5. Testar notificações WhatsApp (se conectado)

---

## Recursos Úteis

- **Docs Sofia:** `/lib/sofia/flows.ts`
- **Docs CRM:** `/app/corretor/`
- **Docs Salva-Leads:** `/lib/salva-leads/`
- **Schema:** `/lib/migrations/salva-leads-schema.sql`
- **Testes:** `INTEGRATION_TEST.md`

---

## Próximas Steps Após Testes Locais

✅ Tudo funcionando? Então:

```bash
# 1. Commit
git add -A
git commit -m "test: verificado fluxo sofia+crm+salva-leads localmente"

# 2. Deploy (ver DEPLOY_SCRIPT.sh)
bash DEPLOY_SCRIPT.sh
```
