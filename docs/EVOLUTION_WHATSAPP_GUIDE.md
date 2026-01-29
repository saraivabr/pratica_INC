# Evolution WhatsApp API - Guia de Integração

Sistema completo de integração WhatsApp multi-tenant usando Evolution API v2.

## Sumário

- [Configuração](#configuração)
- [Criar Instância WhatsApp](#criar-instância-whatsapp)
- [Listar Instâncias](#listar-instâncias)
- [Webhooks](#webhooks)
- [Mensagens](#mensagens)
- [Troubleshooting](#troubleshooting)

---

## Configuração

### Variáveis de Ambiente

```env
EVOLUTION_BASE_URL=https://pratica-evolution-api.robuvi.easypanel.host
EVOLUTION_API_KEY=429683C4C977415CAAFCCE10F7D57E11
```

### Estrutura do Banco de Dados

As tabelas foram criadas na migration `005_evolution_whatsapp.sql`:

- `whatsapp_messages` - Armazena todas as mensagens (enviadas e recebidas)
- `whatsapp_contacts` - Cache de contatos com auto-match para leads
- `whatsapp_campaigns` - Campanhas de envio em massa

---

## Criar Instância WhatsApp

### Via API

```bash
curl -X POST http://localhost:3000/api/tenants/1/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Prática - Comercial",
    "reject_call": false,
    "groups_ignore": true,
    "always_online": false,
    "read_messages": false
  }'
```

### Resposta de Sucesso

```json
{
  "success": true,
  "data": {
    "instance": {
      "instance_name": "pratica-demo-1768692247251",
      "display_name": "Prática - Comercial",
      "qr_code": "data:image/png;base64,...",
      "status": "disconnected",
      "webhook_url": "http://localhost:3000/api/webhook/evolution/1",
      "settings": {
        "reject_call": false,
        "groups_ignore": true
      }
    },
    "qr_code": "data:image/png;base64,...",
    "pairing_code": null
  }
}
```

### Scanear QR Code

1. Copie o `qr_code` (data URI base64)
2. Exiba em um `<img>` tag no frontend
3. Escaneie com WhatsApp → Aparelhos conectados → Conectar um aparelho

---

## Listar Instâncias

```bash
curl http://localhost:3000/api/tenants/1/whatsapp
```

Resposta:

```json
{
  "success": true,
  "data": [
    {
      "instance_name": "pratica-demo-1768692247251",
      "display_name": "Prática - Comercial",
      "status": "disconnected",
      "connection_state": "close",
      "created_at": "2026-01-17T23:24:13.214Z"
    }
  ],
  "total": 1
}
```

---

## Webhooks

### Eventos Configurados

O sistema recebe automaticamente os seguintes eventos:

- `MESSAGES_UPSERT` - Nova mensagem recebida/enviada
- `MESSAGES_UPDATE` - Status de mensagem atualizado (entregue, lida)
- `CONNECTION_UPDATE` - Mudança no status da conexão
- `QRCODE_UPDATED` - Novo QR Code gerado

### URL do Webhook

```
POST /api/webhook/evolution/:tenantId
```

Cada tenant tem seu próprio webhook: `http://localhost:3000/api/webhook/evolution/1`

### Processamento Automático

**Mensagens Recebidas:**
1. Salva mensagem em `whatsapp_messages`
2. Verifica se existe lead com o telefone em `cvcrm_leads`
3. Se encontrar, associa `lead_id` à mensagem
4. TODO: Criar interação no CV CRM

**Mensagens Enviadas:**
1. Salva em `whatsapp_messages` com `is_from_me = true`

**Atualizações de Status:**
1. Atualiza campo `status` em `whatsapp_messages` (delivered, read, failed)

---

## Mensagens

### Enviar Mensagem de Texto

```typescript
import { sendTextMessage } from '@/lib/evolution-api';

await sendTextMessage('pratica-demo-1768692247251', {
  number: '5511999999999', // DDD + número
  text: 'Olá! Como posso ajudar?',
});
```

### Enviar Mensagem com Mídia

```typescript
import { sendMediaMessage } from '@/lib/evolution-api';

await sendMediaMessage('pratica-demo-1768692247251', {
  number: '5511999999999',
  media: {
    mediaUrl: 'https://example.com/image.jpg',
    fileName: 'foto.jpg',
    caption: 'Confira esta imagem!',
  },
});
```

### Formatar Número de Telefone

```typescript
import { formatPhoneNumber } from '@/lib/evolution-api';

// (11) 99999-9999 → 5511999999999
const formatted = formatPhoneNumber('(11) 99999-9999');
```

---

## Exemplo de Frontend

### Criar Instância

```tsx
async function createInstance() {
  const response = await fetch('/api/tenants/1/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      displayName: 'Comercial',
      groups_ignore: true,
    }),
  });

  const { data } = await response.json();

  // Exibir QR Code
  setQrCode(data.qr_code);
}
```

### Exibir QR Code

```tsx
{qrCode && (
  <div>
    <h3>Escaneie este QR Code com WhatsApp</h3>
    <img src={qrCode} alt="QR Code WhatsApp" />
  </div>
)}
```

---

## Troubleshooting

### Instância não conecta

- Verifique se o QR Code foi escaneado
- Verifique connection_state via `/api/tenants/1/whatsapp`
- QR Code expira em ~40 segundos, gere um novo se necessário

### Mensagens não chegam no webhook

- Verifique se a instância está `connected` (`connection_state: "open"`)
- Verifique logs do servidor Next.js
- Teste webhook manualmente com curl

### Erro "No fields to update"

- Certifique-se que `evolution_instances` está no `updateTenant` (lib/tenant-context.ts:145-148)

### Erro "Invalid tenant ID"

- Nas versões Next.js 15+, `params` é uma Promise
- Certifique-se de fazer `await context.params` antes de acessar `params.id`

---

## Arquivos Principais

| Arquivo | Descrição |
|---------|-----------|
| `lib/evolution-api.ts` | Cliente completo da Evolution API |
| `lib/tenant-context.ts` | Gerenciamento multi-tenant com suporte a evolution_instances |
| `app/api/tenants/[id]/whatsapp/route.ts` | CRUD de instâncias WhatsApp por tenant |
| `app/api/webhook/evolution/[tenantId]/route.ts` | Recebe eventos WhatsApp e processa mensagens |
| `migrations/005_evolution_whatsapp.sql` | Schema das tabelas WhatsApp |

---

## Próximos Passos

- [ ] Criar página de gerenciamento de instâncias no frontend
- [ ] Implementar envio de mensagens manuais
- [ ] Criar interações automáticas no CV CRM quando receber mensagem
- [ ] Dashboard de estatísticas de mensagens
- [ ] Sistema de templates de mensagens
- [ ] Campanhas de envio em massa

---

## Referências

- [Evolution API Docs](https://doc.evolution-api.com)
- [Evolution API GitHub](https://github.com/EvolutionAPI/evolution-api)
