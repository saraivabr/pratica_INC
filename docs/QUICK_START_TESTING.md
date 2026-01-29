# 🚀 Guia Rápido - Suite de Testes Multi-Tenant WhatsApp

## ⚡ 5 Minutos para Começar

### 1. Instalar Dependências (Já Feito ✅)
```bash
pnpm install  # Já realizado - todas as dependências instaladas
```

### 2. Executar Testes Imediatamente
```bash
# Executar todos os testes unitários
pnpm test:unit

# Resultado esperado:
# ✅ 47 testes passando em ~450ms
```

### 3. Entrar em Watch Mode (Desenvolvimento)
```bash
# Monitora arquivos e reexecuta testes automaticamente
pnpm test:watch

# Pressionar 'q' para sair
```

---

## 📚 Estrutura de Testes

```
__tests__/
├── ✅ setup.ts                    # Setup global (carrega .env.test)
├── ✅ fixtures/                   # Dados pré-definidos
│   ├── baileys-messages.ts       # Mock de mensagens WhatsApp
│   └── database-seeds.ts         # Dados de teste
├── ✅ utils/                      # Utilitários reutilizáveis
│   ├── test-database.ts          # Helper para banco de dados
│   ├── mock-baileys.ts           # Mock do socket Baileys
│   └── mock-worker-server.ts     # Mock do servidor HTTP
├── ✅ unit/                       # Testes de unidade (47 testes)
│   └── worker/
│       ├── encryption.test.ts (19 testes) ✅
│       └── message-extraction.test.ts (28 testes) ✅
├── ✅ integration/                # Testes de integração
│   └── api-to-worker/
│       └── connection-flow.test.ts (8+ testes) ✅
└── ✅ security/                   # Testes de segurança
    └── tenant-isolation.test.ts (10+ testes) ✅
```

---

## 🔧 Comandos Principais

### Executar Testes

```bash
# Testes unitários (rodam em ~450ms)
pnpm test:unit

# Testes de integração
pnpm test:integration

# Testes de segurança
pnpm test:security

# Todos os testes
pnpm test

# Modo watch (reexecuta ao salvar)
pnpm test:watch
```

### Debugging

```bash
# Executar teste específico
pnpm test:unit -- encryption.test.ts

# Watch mode de um arquivo específico
pnpm test:watch -- encryption.test.ts

# Modo verbose
pnpm test:unit --reporter=verbose
```

### Cobertura

```bash
# Gerar relatório de cobertura
pnpm test:coverage

# Visualizar coverage em HTML (abre em ./coverage/index.html)
```

---

## 🧪 O Que Está Testado

### ✅ Criptografia (19 testes)

**Arquivo:** `__tests__/unit/worker/encryption.test.ts`

```javascript
// ✅ Todos os aspectos de AES-256-GCM testados:
- Formato correto (iv.tag.data)
- IV aleatório por encriptação
- Auth tag detecta tamper
- Round-trip encryption/decryption
- Diferentes chaves = outputs diferentes
- Unicode suportado
- Dados binários suportados
```

**Como testar:**
```bash
pnpm test:unit -- encryption.test.ts
```

---

### ✅ Extração de Mensagem (28 testes)

**Arquivo:** `__tests__/unit/worker/message-extraction.test.ts`

```javascript
// ✅ Suporte a 11 tipos de mensagem:
- Text (conversation)
- Extended text
- Image com caption
- Video com caption
- Button response
- List response
- Document, Audio, Sticker (não suportados)
- Contact, Location (não suportados)
```

**Como testar:**
```bash
pnpm test:unit -- message-extraction.test.ts
```

---

### ✅ Fluxo de Conexão (8+ testes)

**Arquivo:** `__tests__/integration/api-to-worker/connection-flow.test.ts`

```javascript
// ✅ Valida:
- Criação de sessão
- Geração de QR
- Conexão bem-sucedida
- Envio de mensagens
- Logout
- Isolamento entre tenants
```

**Como testar:**
```bash
pnpm test:integration -- connection-flow.test.ts
```

---

### ✅ Isolamento de Tenant (10+ testes)

**Arquivo:** `__tests__/security/tenant-isolation.test.ts`

```javascript
// ✅ Valida:
- Filtragem por tenant
- Sem cross-tenant leakage
- Unique constraint
- Cascade delete
- SQL injection bloqueado
- Session data encriptado
```

**Como testar:**
```bash
pnpm test:security -- tenant-isolation.test.ts
```

---

## 📝 Como Usar os Utilities

### TestDatabase

```typescript
import { createTestDatabase } from '__tests__/utils/test-database'

// Criar instância
const testDb = createTestDatabase()

// Criar tenant
const tenant = await testDb.createTenant('Meu Tenant')
// Resultado: { id: 'uuid', nome: 'Meu Tenant', cnpj: '...' }

// Criar usuário
const user = await testDb.createUser({
  tenantId: tenant.id,
  phone: '+5511999999999'
})

// Criar sessão WhatsApp
const session = await testDb.createWhatsAppSession(user.id, {
  status: 'ready',
  paired_phone: '5511999999999'
})

// Transações
await testDb.beginTransaction()
// ... fazer testes ...
await testDb.rollback()  // Desfaz automaticamente

// Cleanup
await testDb.cleanup()
await testDb.close()
```

---

### MockBaileysSocket

```typescript
import { createMockBaileysSocket } from '__tests__/utils/mock-baileys'

// Criar socket mock
const socket = createMockBaileysSocket()

// Simular eventos
socket.simulateQR('qr-code-data')
socket.simulateConnected('5511999999999', 'Meu Device')
socket.simulateDisconnect('Desconectado pelo usuário')

// Enviar mensagens
const result = await socket.sendMessage(
  '5511988887777@s.whatsapp.net',
  { text: 'Olá!' }
)

// Reset
socket.reset()
```

---

### MockWorkerServer

```typescript
import { startMockWorker } from '__tests__/utils/mock-worker-server'

// Iniciar servidor mock
const worker = await startMockWorker(3005)

// Simular eventos
worker.simulateQR(tenantId, userId, 'qr-code')
worker.simulateConnected(tenantId, userId, '5511999999999')

// Fazer requisições
const response = await fetch(
  'http://localhost:3005/api/whatsapp/{tenant}/{user}/status'
)

// Parar servidor
await worker.stop()
```

---

## 🎯 Casos de Uso Comuns

### Testar Nova Funcionalidade

1. Escrever o teste primeiro
2. Executar `pnpm test:watch`
3. Implementar funcionalidade
4. Teste passa ✅

### Debugar Teste Falhando

```bash
# Executar teste específico com verbose
pnpm test:unit -- encryption.test.ts --reporter=verbose

# Ou em watch mode para debugar interativo
pnpm test:watch -- encryption.test.ts
```

### Adicionar Novo Teste

1. Criar arquivo em `__tests__/unit/novo-test.ts`
2. Importar utilidades necessárias
3. Usar fixtures/seeds para dados
4. Executar `pnpm test:watch`

---

## 🔐 Verificar Segurança

### Validar Isolamento de Tenant

```bash
pnpm test:security -- tenant-isolation.test.ts
```

Isso valida:
- ✅ Queries filtram por tenant
- ✅ Nenhuma cross-tenant leakage
- ✅ SQL injection bloqueado

### Validar Criptografia

```bash
pnpm test:unit -- encryption.test.ts
```

Isso valida:
- ✅ AES-256-GCM correto
- ✅ IV aleatório
- ✅ Tamper detection
- ✅ Nenhum plaintext

---

## 📊 Visualizar Cobertura

```bash
# Gerar relatório
pnpm test:coverage

# Abrir em navegador
open coverage/index.html
```

Isso mostra:
- Linhas cobertas
- Branches cobertas
- Funções cobertas
- Statements cobertas

---

## 🐛 Troubleshooting

### Testes falhando?

```bash
# 1. Limpar cache
rm -rf node_modules/.vitest

# 2. Reinstalar dependências
pnpm install

# 3. Rodar testes novamente
pnpm test:unit
```

### Erro de conexão DB?

Certifique-se que `.env.test` existe:
```bash
cat .env.test

# Deve conter:
# TEST_DATABASE_URL=postgresql://test:test@localhost:5432/test_db
# DATABASE_URL=postgresql://test:test@localhost:5432/test_db
```

### Timeout em testes?

Aumentar timeout em `vitest.config.ts`:
```typescript
test: {
  testTimeout: 10000,  // ms
  hookTimeout: 10000
}
```

---

## 📖 Documentação Completa

Para informações mais detalhadas:

1. **`TESTING_VALIDATION_REPORT.md`** - Relatório completo
2. **`TESTING_CHECKLIST.md`** - Checklist de todos os testes
3. **Código dos testes** - Exemplos práticos

---

## ✅ Checklist Rápido

- [x] Dependências instaladas
- [x] 47 testes unitários passando
- [x] 8+ testes integração prontos
- [x] 10+ testes segurança validados
- [x] Utilities implementadas
- [x] Fixtures criadas
- [x] Documentação completa
- [x] Scripts NPM configurados

---

## 🎓 Próximas Etapas

**Semana 1:** Executar `pnpm test:unit` diariamente
**Semana 2:** Adicionar E2E tests com Playwright
**Semana 3:** Configurar CI/CD com GitHub Actions
**Semana 4:** Alcançar 85%+ de code coverage

---

## 📞 Suporte Rápido

```bash
# Ver todos os testes
pnpm test:unit --list

# Executar teste com padrão
pnpm test:unit -- "encryption"

# Modo debug (pausar em breakpoint)
node --inspect-brk ./node_modules/.bin/vitest run

# Gerar relatório JSON
pnpm test:unit --reporter=json > report.json
```

---

**Status:** ✅ Pronto para Usar
**Última Atualização:** 17/01/2026
**Tempo para Começar:** 2 minutos
