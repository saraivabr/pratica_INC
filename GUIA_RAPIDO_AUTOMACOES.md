# 🚀 Guia Rápido: Automações CRM

## 📋 Índice

1. [Como Funcionam as Automações](#como-funcionam)
2. [Criar Notificação Manual](#criar-notificação)
3. [Criar Lembrete](#criar-lembrete)
4. [Configurar Nova Automação](#nova-automação)
5. [Monitorar Execuções](#monitorar)

---

## 🤖 Como Funcionam as Automações {#como-funcionam}

### Fluxo Automático

```
Lead Criado → Sistema verifica automações ativas
           → Encontra "Boas-vindas Novo Lead"
           → Aguarda trigger (imediato ou delay)
           → Substitui variáveis no template
           → Envia mensagem WhatsApp
           → Registra execução
           → Atualiza estatísticas
```

### Triggers Disponíveis

| Trigger | Descrição | Config Exemplo |
|---------|-----------|----------------|
| `novo_lead` | Lead acabou de ser criado | `{"delay_minutos": 0}` |
| `dias_sem_resposta` | Lead não respondeu há X dias | `{"dias": 3}` |
| `lead_frio` | Lead está frio há X dias | `{"dias": 7}` |

### Variáveis nos Templates

```
{nome}            → Nome do lead
{corretor_nome}   → Nome do corretor responsável
{empreendimento}  → Nome do empreendimento de interesse
{imovel}          → Sinônimo de {empreendimento}
```

**Exemplo:**
```
Template: "Olá {nome}! Sou {corretor_nome}. Vi que você se interessou por {empreendimento}."

Resultado: "Olá João Silva! Sou Maria Santos. Vi que você se interessou por Residencial Aurora."
```

---

## 📬 Criar Notificação Manual {#criar-notificação}

### Via API

```bash
curl -X POST https://pratica.app/api/notificacoes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "tipo": "lembrete",
    "titulo": "Ligar para cliente",
    "mensagem": "João Silva pediu para ligar às 15h",
    "lead_id": "uuid-do-lead",
    "prioridade": "alta",
    "acao_url": "/crm/leads/uuid-do-lead",
    "acao_label": "Ver Lead"
  }'
```

### Via Código (dentro do sistema)

```typescript
import pool from '@/lib/db';

await pool.query(
  `INSERT INTO notificacoes (
    tenant_id, workspace_id, user_id,
    tipo, titulo, mensagem, prioridade
  ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
  [
    tenantId,
    workspaceId,
    userId,
    'novo_lead',
    'Novo Lead Capturado!',
    'João Silva demonstrou interesse no Residencial Aurora',
    'alta'
  ]
);
```

---

## ⏰ Criar Lembrete {#criar-lembrete}

### Via SQL Direto

```sql
INSERT INTO lembretes (
  tenant_id,
  workspace_id,
  user_id,
  lead_id,
  titulo,
  descricao,
  data_lembrete
) VALUES (
  1,                                    -- tenant_id
  1,                                    -- workspace_id
  'uuid-do-usuario',                    -- user_id
  'uuid-do-lead',                       -- lead_id (opcional)
  'Ligar para cliente',                 -- titulo
  'Confirmar interesse no apto 301',    -- descricao
  '2026-01-30 15:00:00'                 -- data_lembrete
);
```

### Via API (criar endpoint se necessário)

```typescript
// app/api/lembretes/route.ts
export async function POST(request: NextRequest) {
  const ctx = await requireWorkspaceContext(request);
  const { titulo, descricao, data_lembrete, lead_id } = await request.json();

  await pool.query(
    `INSERT INTO lembretes (
      tenant_id, workspace_id, user_id,
      titulo, descricao, data_lembrete, lead_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [ctx.tenantId, ctx.workspaceId, ctx.user.id, titulo, descricao, data_lembrete, lead_id]
  );
}
```

**Processamento:** O cron `/api/cron/processar-lembretes` roda a cada 5 minutos e:
1. Encontra lembretes com `data_lembrete <= NOW()`
2. Cria notificação para o usuário
3. Marca lembrete como processado

---

## ⚙️ Configurar Nova Automação {#nova-automação}

### 1. Via SQL

```sql
INSERT INTO automacoes_followup (
  tenant_id,
  workspace_id,
  nome,
  descricao,
  ativo,
  trigger_tipo,
  trigger_config,
  acao_tipo,
  acao_config,
  template_mensagem
) VALUES (
  1,
  1,
  'Follow-up 5 Dias',
  'Mensagem após 5 dias sem interação',
  true,
  'dias_sem_resposta',
  '{"dias": 5}',
  'whatsapp',
  '{}',
  'Oi {nome}! Tudo bem?

Faz alguns dias que não conversamos... 😊

Ainda posso te ajudar com o {empreendimento}?

Manda uma mensagem! 💬'
);
```

### 2. Via Interface (futuro)

Criar página em `/crm/automacoes` com formulário:

```typescript
// app/crm/automacoes/nova/page.tsx
<form onSubmit={salvarAutomacao}>
  <input name="nome" placeholder="Nome da automação" />
  <textarea name="descricao" />
  
  <select name="trigger_tipo">
    <option value="novo_lead">Novo Lead</option>
    <option value="dias_sem_resposta">Dias Sem Resposta</option>
    <option value="lead_frio">Lead Frio</option>
  </select>

  <input name="dias" type="number" placeholder="Quantos dias?" />
  
  <textarea 
    name="template_mensagem" 
    placeholder="Use: {nome}, {corretor_nome}, {empreendimento}"
  />
  
  <button type="submit">Salvar Automação</button>
</form>
```

---

## 📊 Monitorar Execuções {#monitorar}

### Ver Estatísticas de uma Automação

```sql
SELECT 
  af.nome,
  af.total_execucoes,
  af.ultima_execucao,
  COUNT(ae.id) FILTER (WHERE ae.sucesso = true) as sucessos,
  COUNT(ae.id) FILTER (WHERE ae.sucesso = false) as erros
FROM automacoes_followup af
LEFT JOIN automacoes_execucoes ae ON ae.automacao_id = af.id
WHERE af.id = 1
GROUP BY af.id, af.nome, af.total_execucoes, af.ultima_execucao;
```

### Ver Últimas Execuções

```sql
SELECT 
  ae.created_at,
  af.nome as automacao,
  l.name as lead_nome,
  ae.sucesso,
  ae.erro_mensagem,
  ae.dados_enviados->>'telefone' as telefone_enviado
FROM automacoes_execucoes ae
JOIN automacoes_followup af ON af.id = ae.automacao_id
LEFT JOIN leads l ON l.id = ae.lead_id
ORDER BY ae.created_at DESC
LIMIT 50;
```

### Dashboard de Automações (SQL para criar view)

```sql
CREATE OR REPLACE VIEW dashboard_automacoes AS
SELECT 
  af.id,
  af.nome,
  af.ativo,
  af.trigger_tipo,
  af.total_execucoes,
  af.ultima_execucao,
  COUNT(ae.id) as total_logs,
  COUNT(ae.id) FILTER (WHERE ae.sucesso = true) as sucessos,
  COUNT(ae.id) FILTER (WHERE ae.sucesso = false) as erros,
  ROUND(
    COUNT(ae.id) FILTER (WHERE ae.sucesso = true)::numeric / 
    NULLIF(COUNT(ae.id), 0) * 100, 
    2
  ) as taxa_sucesso
FROM automacoes_followup af
LEFT JOIN automacoes_execucoes ae ON ae.automacao_id = af.id
GROUP BY af.id, af.nome, af.ativo, af.trigger_tipo, af.total_execucoes, af.ultima_execucao
ORDER BY af.id;

-- Usar:
SELECT * FROM dashboard_automacoes;
```

---

## 🔧 Comandos Úteis

### Testar Cron Manualmente

```bash
# Processar lembretes
curl http://localhost:3000/api/cron/processar-lembretes

# Processar follow-ups
curl http://localhost:3000/api/cron/processar-followups
```

### Ver Logs em Tempo Real

```bash
# Logs do app
tail -f /var/log/pratica-app.log

# Logs dos crons
tail -f /var/log/pratica-lembretes.log
tail -f /var/log/pratica-followups.log
```

### Reprocessar Lembrete Manualmente

```sql
-- Marcar como não processado
UPDATE lembretes 
SET processado = false, processado_em = NULL 
WHERE id = 123;

-- Executar cron
-- curl http://localhost:3000/api/cron/processar-lembretes
```

### Desativar Automação Temporariamente

```sql
UPDATE automacoes_followup 
SET ativo = false 
WHERE nome = 'Follow-up 3 Dias';
```

### Zerar Estatísticas de Automação

```sql
UPDATE automacoes_followup 
SET total_execucoes = 0, ultima_execucao = NULL 
WHERE id = 1;
```

---

## ⚠️ Troubleshooting

### Mensagens não estão sendo enviadas

1. **Verificar se automação está ativa:**
   ```sql
   SELECT nome, ativo FROM automacoes_followup;
   ```

2. **Verificar logs de execução:**
   ```sql
   SELECT * FROM automacoes_execucoes 
   WHERE sucesso = false 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

3. **Testar envio manual de WhatsApp:**
   ```typescript
   import { sendTextMessage } from '@/lib/zapi';
   await sendTextMessage('+5511999999999', 'Teste');
   ```

### Notificações não aparecem

1. **Verificar se existem:**
   ```sql
   SELECT * FROM notificacoes WHERE user_id = 'uuid' ORDER BY created_at DESC;
   ```

2. **Verificar permissões:**
   - workspace_id está correto?
   - user_id está correto?

### Lembretes não são processados

1. **Verificar se há lembretes pendentes:**
   ```sql
   SELECT * FROM lembretes 
   WHERE processado = false 
   AND data_lembrete <= NOW();
   ```

2. **Verificar se cron está rodando:**
   ```bash
   crontab -l | grep processar-lembretes
   ```

3. **Executar manualmente:**
   ```bash
   curl http://localhost:3000/api/cron/processar-lembretes
   ```

---

## 📚 Referências

- **Documentação completa:** `/RELATORIO_CRM_AUTOMACOES.md`
- **Migration:** `/migrations/029_crm_automations.sql`
- **APIs:**
  - `/api/notificacoes`
  - `/api/cron/processar-lembretes`
  - `/api/cron/processar-followups`

---

**Dúvidas?** Consulte os logs ou verifique o código-fonte dos endpoints.
