# 🔥 PLANO DE CORREÇÕES PRIORITÁRIAS

**Objetivo:** Deixar o produto REALMENTE pronto para usar
**Prazo:** Próximas 2 horas

---

## 🚨 **FASE 1: CORREÇÕES CRÍTICAS (30 min)**

### 1.1. Corrigir Build ✅
- [x] Erro no rate-limiter.ts corrigido
- [ ] Validar build passa sem erros

### 1.2. Adicionar Validações Essenciais (15 min)

#### app/api/acoes/simulacao/route.ts
```typescript
// Antes do cálculo, adicionar:
if (valor_imovel <= 0) {
  return NextResponse.json(
    { error: 'Valor do imóvel deve ser maior que zero' },
    { status: 400 }
  );
}

if (entrada < 0 || entrada > valor_imovel) {
  return NextResponse.json(
    { error: 'Entrada inválida' },
    { status: 400 }
  );
}

if (taxa_juros < 0 || taxa_juros > 50) {
  return NextResponse.json(
    { error: 'Taxa de juros deve estar entre 0% e 50%' },
    { status: 400 }
  );
}

if (prazo_meses < 12 || prazo_meses > 480) {
  return NextResponse.json(
    { error: 'Prazo deve estar entre 12 e 480 meses' },
    { status: 400 }
  );
}
```

#### app/api/acoes/agendar-visita/route.ts
```typescript
// Validar data
const dataVisita = new Date(data_visita);
const agora = new Date();

if (dataVisita < agora) {
  return NextResponse.json(
    { error: 'Data da visita deve ser no futuro' },
    { status: 400 }
  );
}

if (dataVisita > new Date(agora.getTime() + 90 * 24 * 60 * 60 * 1000)) {
  return NextResponse.json(
    { error: 'Data da visita não pode ser mais de 90 dias no futuro' },
    { status: 400 }
  );
}
```

### 1.3. Adicionar Try-Catch Robusto (10 min)

Criar helper:
```typescript
// lib/api-helpers.ts
export function withErrorHandling(handler: Function) {
  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error: any) {
      console.error('[API Error]', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  };
}
```

---

## ⚡ **FASE 2: FUNCIONALIDADES CRÍTICAS (45 min)**

### 2.1. Implementar Cron Job para Lembretes (30 min)

#### Criar endpoint que processa lembretes:
```typescript
// app/api/cron/processar-lembretes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processarLembretesPendentes } from '@/lib/services/agendamentoService';

export async function GET(request: NextRequest) {
  // Validar token secreto
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resultado = await processarLembretesPendentes();
    
    return NextResponse.json({
      success: true,
      ...resultado,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Erro ao processar lembretes',
      details: error.message
    }, { status: 500 });
  }
}
```

#### Configurar no Scalingo:
```bash
# Adicionar Scheduler addon
scalingo addons-add scheduler:standard

# Configurar job (via dashboard ou CLI)
# URL: https://pratica.osc-fr1.scalingo.io/api/cron/processar-lembretes
# Schedule: */5 * * * * (a cada 5 minutos)
# Headers: Authorization: Bearer ${CRON_SECRET}
```

### 2.2. Melhorar Webhook WhatsApp (15 min)

#### Verificar se já existe:
```bash
ls -la app/api/webhook/zapi/
```

#### Se não existir ou estiver incompleto, atualizar:
```typescript
// app/api/webhook/zapi/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processarRespostaConfirmacao } from '@/lib/services/notificacaoService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Z-API envia diferentes tipos de eventos
    const { event, data } = body;
    
    if (event !== 'message.received') {
      return NextResponse.json({ received: true });
    }
    
    // Extrair dados da mensagem
    const telefone = data.from || data.phone;
    const mensagem = data.text?.message || data.body || '';
    
    if (!telefone || !mensagem) {
      return NextResponse.json({ received: true });
    }
    
    // Processar confirmação
    const confirmou = await processarRespostaConfirmacao(telefone, mensagem);
    
    return NextResponse.json({
      received: true,
      processed: true,
      confirmou
    });
  } catch (error: any) {
    console.error('[Webhook Z-API] Error:', error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
```

---

## 📊 **FASE 3: MELHORIAS RÁPIDAS (30 min)**

### 3.1. Adicionar Paginação em Notificações (10 min)

```typescript
// app/api/notificacoes/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = (page - 1) * limit;
  const corretor_id = searchParams.get('corretor_id') || 'default-user';
  
  // Buscar total
  const { rows: totalRows } = await dbQuery(
    `SELECT COUNT(*) as total FROM notificacoes WHERE corretor_id = $1`,
    [corretor_id]
  );
  const total = parseInt(totalRows[0].total, 10);
  
  // Buscar página
  const { rows } = await dbQuery(
    `
    SELECT n.*, l.name as lead_nome
    FROM notificacoes n
    LEFT JOIN leads l ON n.lead_id = l.id
    WHERE n.corretor_id = $1
    ORDER BY n.created_at DESC
    LIMIT $2 OFFSET $3
    `,
    [corretor_id, limit, offset]
  );
  
  return NextResponse.json({
    notificacoes: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    }
  });
}
```

### 3.2. Adicionar Bulk Operations (10 min)

```typescript
// app/api/notificacoes/bulk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, corretor_id = 'default-user', ids } = body;
    
    if (action === 'mark_all_read') {
      await dbQuery(
        `UPDATE notificacoes SET lida = TRUE WHERE corretor_id = $1 AND lida = FALSE`,
        [corretor_id]
      );
      return NextResponse.json({ success: true, message: 'Todas marcadas como lidas' });
    }
    
    if (action === 'mark_read' && Array.isArray(ids)) {
      await dbQuery(
        `UPDATE notificacoes SET lida = TRUE WHERE id = ANY($1)`,
        [ids]
      );
      return NextResponse.json({ success: true, message: `${ids.length} marcadas como lidas` });
    }
    
    if (action === 'delete' && Array.isArray(ids)) {
      await dbQuery(
        `DELETE FROM notificacoes WHERE id = ANY($1)`,
        [ids]
      );
      return NextResponse.json({ success: true, message: `${ids.length} deletadas` });
    }
    
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 3.3. Adicionar Histórico de Simulações (10 min)

```typescript
// app/api/acoes/simulacao/historico/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lead_id = searchParams.get('lead_id');
    
    if (!lead_id) {
      return NextResponse.json({ error: 'lead_id obrigatório' }, { status: 400 });
    }
    
    const { rows } = await dbQuery(
      `
      SELECT * FROM simulacoes
      WHERE lead_id = $1
      ORDER BY created_at DESC
      LIMIT 10
      `,
      [lead_id]
    );
    
    return NextResponse.json({
      lead_id,
      simulacoes: rows,
      total: rows.length
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## 🧪 **FASE 4: TESTES MANUAIS (15 min)**

### Checklist de Testes

#### 1. Simulação Financeira
```bash
# Teste válido
curl -X POST http://localhost:3000/api/acoes/simulacao \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "LEAD_UUID_VALIDO",
    "valor_imovel": 500000,
    "entrada": 100000,
    "taxa_juros": 10,
    "prazo_meses": 360,
    "enviar_whatsapp": false
  }'

# Teste entrada negativa
curl -X POST http://localhost:3000/api/acoes/simulacao \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "LEAD_UUID_VALIDO",
    "valor_imovel": 500000,
    "entrada": -10000,
    "taxa_juros": 10,
    "prazo_meses": 360
  }'
# Esperado: erro 400

# Teste taxa absurda
curl -X POST http://localhost:3000/api/acoes/simulacao \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "LEAD_UUID_VALIDO",
    "valor_imovel": 500000,
    "entrada": 100000,
    "taxa_juros": 1000,
    "prazo_meses": 360
  }'
# Esperado: erro 400
```

#### 2. Agendamento
```bash
# Teste data no passado
curl -X POST http://localhost:3000/api/acoes/agendar-visita \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "LEAD_UUID_VALIDO",
    "data_visita": "2020-01-01T10:00:00-03:00",
    "imovel_nome": "Teste"
  }'
# Esperado: erro 400

# Teste válido
curl -X POST http://localhost:3000/api/acoes/agendar-visita \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "LEAD_UUID_VALIDO",
    "data_visita": "2026-02-01T14:00:00-03:00",
    "imovel_nome": "Apto Vila Mariana",
    "enviar_whatsapp": false
  }'
```

#### 3. Notificações
```bash
# Criar
curl -X POST http://localhost:3000/api/notificacoes \
  -H "Content-Type: application/json" \
  -d '{
    "corretor_id": "default-user",
    "tipo": "teste",
    "mensagem": "Teste de notificação"
  }'

# Listar
curl http://localhost:3000/api/notificacoes?corretor_id=default-user

# Marcar como lida
curl -X PUT http://localhost:3000/api/notificacoes/[ID] \
  -H "Content-Type: application/json" \
  -d '{ "lida": true }'

# Contagem
curl http://localhost:3000/api/notificacoes/unread-count?corretor_id=default-user
```

#### 4. Analytics
```bash
curl http://localhost:3000/api/analytics/conversao?periodo=30d
curl http://localhost:3000/api/analytics/vendas?periodo=7d
curl http://localhost:3000/api/analytics/tempo-medio?periodo=30d
curl http://localhost:3000/api/analytics/top-imoveis?periodo=all&limit=5
```

---

## 📝 **CHECKLIST FINAL**

Antes de fazer deploy:
- [ ] Build passa sem erros
- [ ] Validações críticas adicionadas
- [ ] Testes manuais passando
- [ ] Cron job configurado
- [ ] Webhook WhatsApp funcionando
- [ ] Documentação atualizada

Depois do deploy:
- [ ] Testar em produção
- [ ] Monitorar logs por 1h
- [ ] Validar notificações chegam
- [ ] Testar WhatsApp real
- [ ] Verificar analytics com dados reais

---

**Tempo Total Estimado:** 2 horas
**Prioridade:** 🔥 CRÍTICA
