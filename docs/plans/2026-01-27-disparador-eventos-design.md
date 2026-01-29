# Disparador de Eventos para Corretores

## Visão Geral

Módulo para criar eventos e convidar corretores via WhatsApp, onde a IA (Sofia) conduz toda a conversa - desde o convite até a confirmação e lembrete automático.

## Fluxo Principal

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Criar Evento   │ ──▶ │  Selecionar      │ ──▶ │  Revisar e      │
│  (nome, data,   │     │  Corretores      │     │  Disparar       │
│  local, desc)   │     │  (base ou upload)│     │  Convites       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Dashboard      │ ◀── │  IA coleta       │ ◀── │  IA responde    │
│  com status     │     │  confirmação     │     │  dúvidas        │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │  Lembrete        │
                        │  automático      │
                        └──────────────────┘
```

## Estrutura de Dados

### Tabela `eventos`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| tenant_id | INTEGER | Isolamento multi-tenant |
| nome | VARCHAR(255) | Nome do evento |
| descricao | TEXT | Detalhes do evento |
| data_hora | TIMESTAMP | Quando acontece |
| local | TEXT | Endereço/local |
| lembrete_horas | INTEGER | 1, 6, 12, 24 ou 48h antes |
| status | VARCHAR(20) | rascunho, ativo, finalizado, cancelado |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Última atualização |

### Tabela `evento_convidados`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| evento_id | UUID | FK para eventos |
| tenant_id | INTEGER | Isolamento multi-tenant |
| nome | VARCHAR(255) | Nome do corretor |
| celular | VARCHAR(50) | Número WhatsApp |
| origem | VARCHAR(20) | 'cvcrm' ou 'importado' |
| cvcrm_id | INTEGER | Se veio da base (nullable) |
| status | VARCHAR(20) | pendente, confirmado, recusado, talvez |
| convite_enviado_at | TIMESTAMP | Quando enviou o convite |
| lembrete_enviado_at | TIMESTAMP | Quando enviou o lembrete |
| confirmado_at | TIMESTAMP | Quando respondeu |
| created_at | TIMESTAMP | Data de criação |

## Interface (Telas)

### Tela 1 - Lista de Eventos (`/admin/eventos`)

- Tabela com: Nome, Data/Hora, Local, Status, Confirmados/Total
- Botões: "Novo Evento", e para cada linha: Ver, Editar, Cancelar
- Filtros: Status (todos, ativos, finalizados)

### Tela 2 - Criar/Editar Evento (`/admin/eventos/novo`)

- Formulário com campos:
  - Nome do evento*
  - Data e hora*
  - Local*
  - Descrição (textarea)
  - Lembrete: dropdown (1h, 6h, 12h, 24h, 48h antes)
- Botão "Próximo: Selecionar Corretores"

### Tela 3 - Selecionar Corretores (`/admin/eventos/[id]/convidados`)

- Duas abas: "Da Base" e "Importar Planilha"
- **Aba "Da Base":**
  - Lista de corretores do CV CRM com checkbox
  - Filtros: Time, Imobiliária, Busca por nome
  - "Selecionar todos" / "Limpar seleção"
- **Aba "Importar":**
  - Upload de Excel/CSV
  - Preview dos dados antes de confirmar
  - Colunas esperadas: Nome, Celular
- Contador: "X corretores selecionados"
- Botão "Próximo: Revisar Convite"

### Tela 4 - Revisar e Disparar (`/admin/eventos/[id]/disparar`)

- Preview da mensagem gerada pela IA (exemplo)
- Botão "Regenerar mensagem" se não gostar
- Lista resumida dos destinatários
- Botão "Disparar Convites"

### Tela 5 - Dashboard do Evento (`/admin/eventos/[id]`)

- Cards: Total, Pendentes, Confirmados, Recusados, Talvez
- Lista de convidados com status e horário da resposta
- Botão "Reenviar" para pendentes específicos

## Inteligência Artificial (Sofia)

### Geração do Convite (Anti-Spam)

A IA gera uma mensagem **única para cada corretor** no momento do disparo, variando:

- Saudação (Oi, Olá, E aí, Fala, Bom dia)
- Formato da data (15/02, 15 de fevereiro, próximo sábado)
- Uso de emojis (com, sem, diferentes)
- Estrutura (pergunta no final, no meio, implícita)
- Tom (mais formal, mais casual)

**Exemplos de variação (mesmo evento, corretores diferentes):**

```
Corretor 1:
"E aí João! Tudo bem? Queria te convidar pro Lançamento do Edifício Aurora,
dia 15/02 às 19h na Av. Paulista, 1000. Vai ser bem legal, bora? Me confirma aí!"

Corretor 2:
"Oi Maria, tudo certo? 🙂 No dia 15 de fevereiro às 19h vai rolar o
lançamento do Edifício Aurora. Local: Av. Paulista, 1000.
Posso contar com sua presença?"

Corretor 3:
"Fala Carlos! Passa lá no lançamento do Aurora dia 15/02, 19h.
Vai ser na Paulista, 1000. Confirma pra mim se vai conseguir ir!"
```

### Contexto para Dúvidas

Quando corretor responde, Sofia recebe:
- Dados do evento (nome, data, local, descrição)
- Status atual do convidado
- Histórico da conversa

Sofia responde dúvidas naturalmente baseada na descrição do evento.

### Detecção de Confirmação

Sofia identifica intenções:
- ✅ "Vou sim", "Pode confirmar", "Estarei lá" → status = confirmado
- ❌ "Não vou poder", "Infelizmente não" → status = recusado
- 🤔 "Vou tentar", "Ainda não sei" → status = talvez

### Lembrete Automático

Job agendado verifica eventos próximos. X horas antes (configurado), envia para confirmados e "talvez" uma mensagem de lembrete (também variada pela IA).

### Proteção Anti-Spam

- Mensagens únicas geradas por IA para cada destinatário
- Delay aleatório de 5-15 segundos entre cada envio

## Integrações

| Sistema | Uso |
|---------|-----|
| Evolution API | Envio e recebimento de mensagens WhatsApp |
| Sofia | IA conversacional para dúvidas e confirmações |
| CV CRM | Base de corretores (cvcrm_corretores) |

## Rotas da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/eventos` | Lista eventos do tenant |
| POST | `/api/eventos` | Cria novo evento |
| GET | `/api/eventos/[id]` | Detalhes do evento |
| PUT | `/api/eventos/[id]` | Atualiza evento |
| DELETE | `/api/eventos/[id]` | Cancela evento |
| GET | `/api/eventos/[id]/convidados` | Lista convidados |
| POST | `/api/eventos/[id]/convidados` | Adiciona convidados |
| POST | `/api/eventos/[id]/convidados/importar` | Importa planilha |
| POST | `/api/eventos/[id]/disparar` | Dispara convites |
| POST | `/api/eventos/[id]/gerar-mensagem` | Gera preview de mensagem |

## Decisões de Design

1. **Híbrido com revisão**: Usuário sempre revisa antes de disparar
2. **Multi-fonte de corretores**: Base CV CRM + importação de planilhas
3. **IA para variação**: Cada mensagem é única para evitar spam
4. **Lembrete configurável**: Flexibilidade por evento (1h a 48h)
5. **Dashboard simples**: Foco em status, sem exportação por ora
