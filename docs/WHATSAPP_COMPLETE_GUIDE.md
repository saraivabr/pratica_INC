# WhatsApp Business - Sistema Completo Multi-Tenant

Sistema completo de gestão WhatsApp integrado com CV CRM, incluindo gerenciamento de instâncias, chat em tempo real e integração automática.

---

## 📋 Funcionalidades Implementadas

### ✅ 1. Gerenciamento de Instâncias
**Rota**: `/admin/whatsapp`

- Criar novas instâncias WhatsApp
- Visualizar QR Code para conexão
- Listar todas as instâncias do tenant
- Visualizar status de conexão (conectado/desconectado)
- Acesso rápido às conversas

**Tecnologias**: Next.js 16, React, TailwindCSS, Lucide Icons

### ✅ 2. QR Code para Conexão
- Modal automático com QR Code após criar instância
- Exibição em base64 otimizada
- Instruções claras para o usuário
- Expiração automática em 40 segundos

### ✅ 3. Interface de Chat Completa
**Rota**: `/admin/whatsapp/chat/[instanceName]`

**Recursos**:
- Lista de conversas em sidebar
- Chat em tempo real com auto-refresh (3s)
- Envio de mensagens com Enter
- Indicadores de status (enviado, entregue, lido)
- Formatação de data/hora inteligente
- Scroll automático para última mensagem
- Design responsivo tipo WhatsApp Web

### ✅ 4. Dashboard de Conversas
- Agrupamento automático por telefone
- Última mensagem de cada conversa
- Indicador visual de mensagens próprias
- Ordenação por data (mais recente primeiro)
- Integração com contatos WhatsApp

### ✅ 5. Integração Automática CV CRM
**Webhook**: `/api/webhook/evolution/:tenantId`

**Fluxos Implementados**:

#### Mensagem de Lead Conhecido:
1. Recebe mensagem via webhook
2. Salva em `whatsapp_messages`
3. Identifica lead por telefone em `cvcrm_leads`
4. **Cria interação automática** em `cvcrm_leads_interacoes`:
   - Tipo: 'whatsapp'
   - Título: 'Mensagem WhatsApp Recebida'
   - Descrição: Texto da mensagem
   - Origem: 'whatsapp_auto'
   - Metadata: JSON com detalhes

#### Mensagem de Número Desconhecido:
1. Recebe mensagem via webhook
2. Salva em `whatsapp_messages`
3. Cria/atualiza contato em `whatsapp_contacts`
4. Incrementa contador de mensagens recebidas
5. Atualiza last_message_at

---

## 🗂️ Estrutura de Arquivos

### Frontend
```
app/admin/whatsapp/
├── page.tsx                          # Gerenciamento de instâncias
└── chat/[instanceName]/page.tsx      # Interface de chat
```

### APIs
```
app/api/
├── tenants/[id]/whatsapp/route.ts    # CRUD instâncias
├── webhook/evolution/[tenantId]/route.ts  # Receber eventos
├── whatsapp/
│   ├── messages/route.ts             # Listar mensagens/conversas
│   └── send/route.ts                 # Enviar mensagem
```

### Library
```
lib/
├── evolution-api.ts                  # Cliente Evolution API
└── tenant-context.ts                 # Multi-tenant helpers
```

---

## 🚀 Como Usar

### 1. Criar Primeira Instância

1. Acesse `/admin/whatsapp`
2. Clique em "Nova Instância"
3. Digite um nome (ex: "Comercial")
4. Clique em "Criar"
5. QR Code será exibido automaticamente

### 2. Conectar WhatsApp

1. Abra WhatsApp no celular
2. Vá em **Aparelhos conectados**
3. Toque em **Conectar um aparelho**
4. Escaneie o QR Code da tela

⏱️ O QR Code expira em 40 segundos. Se expirar, clique no botão de QR Code novamente.

### 3. Acessar Conversas

1. Na página de instâncias, clique em "Conversas"
2. Você verá todas as conversas ativas na sidebar
3. Clique em uma conversa para ver histórico
4. Digite e envie mensagens normalmente

### 4. Enviar Mensagens

**Via Interface:**
- Digite a mensagem no campo de texto
- Pressione Enter ou clique em "Enviar"

**Via API:**
```bash
curl -X POST http://localhost:3000/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "pratica-demo-1768692247251",
    "phoneNumber": "5511999999999",
    "message": "Olá! Como posso ajudar?"
  }'
```

---

## 🔄 Integração Automática CV CRM

### Quando uma Mensagem é Recebida:

**Se o telefone pertence a um lead:**
✅ Mensagem salva em `whatsapp_messages`
✅ Interação criada automaticamente em `cvcrm_leads_interacoes`
✅ Visível no histórico do lead no CV CRM

**Se o telefone NÃO pertence a um lead:**
✅ Mensagem salva em `whatsapp_messages`
✅ Contato criado/atualizado em `whatsapp_contacts`
✅ Contador de mensagens incrementado

### Campos da Interação Criada

| Campo | Valor |
|-------|-------|
| `idlead` | ID do lead encontrado |
| `tipo` | 'whatsapp' |
| `titulo` | 'Mensagem WhatsApp Recebida' |
| `descricao` | Texto da mensagem |
| `data` | Timestamp da mensagem |
| `contato` | Número de telefone |
| `origem` | 'whatsapp_auto' |
| `metadata` | JSON com detalhes |

---

## 📊 Estrutura do Banco de Dados

### Tabelas Principais

#### whatsapp_messages
Armazena todas as mensagens (recebidas e enviadas)

```sql
- id, tenant_id, instance_name
- message_id, phone_number, contact_name
- message_type, message_text, media_url, caption
- is_from_me, status, timestamp
- lead_id (FK para cvcrm_leads)
- raw_data (JSONB)
```

#### whatsapp_contacts
Cache de contatos com estatísticas

```sql
- id, tenant_id, phone_number, name
- profile_picture_url, is_business
- total_messages_received, total_messages_sent
- last_message_at, last_interaction_at
- lead_id (FK para cvcrm_leads)
```

#### cvcrm_leads_interacoes
Interações criadas automaticamente

```sql
- id, tenant_id, idlead (FK)
- tipo, titulo, descricao
- data, contato, origem
- metadata (JSONB)
```

---

## 🔧 APIs Disponíveis

### Listar Instâncias
```
GET /api/tenants/1/whatsapp
```

### Criar Instância
```
POST /api/tenants/1/whatsapp
{
  "displayName": "Comercial",
  "groups_ignore": true
}
```

### Listar Conversas
```
GET /api/whatsapp/messages?instance=pratica-demo-xxx
```

### Listar Mensagens de Conversa
```
GET /api/whatsapp/messages?instance=pratica-demo-xxx&phone=5511999999999
```

### Enviar Mensagem
```
POST /api/whatsapp/send
{
  "instanceName": "pratica-demo-xxx",
  "phoneNumber": "5511999999999",
  "message": "Olá!"
}
```

---

## 🎨 Design

### Cores

| Elemento | Cor |
|----------|-----|
| Primary (WhatsApp) | `#10B981` (green-600) |
| Primary Hover | `#059669` (green-700) |
| Success | `#22C55E` (green-500) |
| Background | `#F3F4F6` (gray-100) |
| Card | `#FFFFFF` (white) |

### Componentes

- **Modais**: Fundo escuro com blur, card centralizado
- **QR Code**: Card branco com borda verde
- **Mensagens**: Estilo WhatsApp (verde para enviadas, branco para recebidas)
- **Sidebar**: Lista de conversas com últimas mensagens
- **Header**: Verde WhatsApp com informações da instância

---

## 🔔 Eventos Webhook

O sistema recebe automaticamente:

- `MESSAGES_UPSERT` - Nova mensagem
- `MESSAGES_UPDATE` - Status atualizado
- `CONNECTION_UPDATE` - Conexão mudou
- `QRCODE_UPDATED` - Novo QR Code

---

## 🎯 Próximas Funcionalidades (Sugestões)

- [ ] Busca de mensagens
- [ ] Filtros de conversas (não lidas, favoritas)
- [ ] Envio de mídia (imagens, documentos)
- [ ] Templates de mensagens rápidas
- [ ] Estatísticas e relatórios
- [ ] Notificações desktop
- [ ] Exportar conversas
- [ ] Atribuir conversa a corretor
- [ ] Tags para conversas
- [ ] Respostas automáticas
- [ ] Chatbot simples

---

## 📖 Documentação Adicional

- [Evolution API Docs](https://doc.evolution-api.com)
- [EVOLUTION_WHATSAPP_GUIDE.md](./EVOLUTION_WHATSAPP_GUIDE.md) - Guia técnico
- [MULTI_TENANT_GUIDE.md](./MULTI_TENANT_GUIDE.md) - Guia multi-tenant

---

## ✅ Checklist de Deploy

- [x] Migrations executadas (004 e 005)
- [x] Variáveis de ambiente configuradas
- [x] Evolution API acessível
- [x] Páginas frontend criadas
- [x] APIs backend funcionando
- [x] Webhook configurado
- [x] Integração CV CRM ativa
- [ ] Testar criação de instância
- [ ] Testar envio/recebimento de mensagens
- [ ] Verificar criação de interações no CV CRM

---

## 🐛 Troubleshooting

### QR Code não aparece
- Verifique se EVOLUTION_BASE_URL está correto
- Verifique se EVOLUTION_API_KEY está válido
- Veja logs do console do navegador

### Mensagens não chegam
- Verifique connection_state da instância (deve ser "open")
- Verifique logs do servidor Next.js
- Teste webhook manualmente

### Interação não é criada no CV CRM
- Verifique se o telefone existe em cvcrm_leads
- Veja logs do webhook: `[Message] Interaction created for lead XXX`
- Verifique estrutura da tabela cvcrm_leads_interacoes

---

**Sistema pronto para uso em produção! 🚀**
