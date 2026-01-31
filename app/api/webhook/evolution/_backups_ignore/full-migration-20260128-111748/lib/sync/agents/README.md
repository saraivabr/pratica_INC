# CV CRM Sync Agents - Implementation Guide

This directory contains the 28 specialized sync agents for CV CRM integration.

## Quick Start

Each agent follows the same pattern established in `01-leads-core.ts`.

### Basic Structure

```typescript
import { BaseSyncAgent } from '../base-agent';
import { AgentConfig } from '../types';

// Define your types
interface CVCRMDataType {
  // CV CRM API response structure
}

interface DBDataType {
  // Database table structure
}

export class YourAgent extends BaseSyncAgent<CVCRMDataType, DBDataType> {
  constructor() {
    const config: AgentConfig = {
      name: 'your-agent-name',
      description: 'What this agent syncs',
      tables: ['table1', 'table2'],
      endpoints: [{
        path: '/api/v1/endpoint',
        tokenEnvVar: 'CVCRM_TOKEN_XXX',
        method: 'GET',
        supportsIncremental: true,
        paginationType: 'offset',
        pageSize: 100,
      }],
      dependencies: ['other-agent'], // Optional
      priority: 1,
      rateLimiter: {
        maxRequestsPerMinute: 60,
        maxRequestsPerSecond: 3,
        burstLimit: 10,
        retryAfterMs: 1000,
      },
    };
    super(config);
  }

  transformData(cvcrmData: CVCRMDataType): DBDataType {
    // Transform CV CRM data to database format
    return {
      cvcrm_id: cvcrmData.id,
      // ... map all fields
      cvcrm_data: JSON.stringify(cvcrmData),
      synced_at: new Date(),
    };
  }

  getUpsertQuery(tableName: string) {
    const sql = `
      INSERT INTO ${tableName} (field1, field2, ...)
      VALUES ($1, $2, ...)
      ON CONFLICT (cvcrm_id)
      DO UPDATE SET
        field1 = EXCLUDED.field1,
        field2 = EXCLUDED.field2,
        ...
        synced_at = EXCLUDED.synced_at,
        updated_at = NOW()
    `;

    const getParams = (data: DBDataType) => [
      data.field1,
      data.field2,
      // ... all values in same order as SQL
    ];

    return { sql, getParams };
  }

  async sync(fullSync = false) {
    console.log(`[${this.config.name}] Starting sync...`);

    const results = await this.syncTable(
      'your_table_name',
      '/api/v1/endpoint',
      'CVCRM_TOKEN_XXX',
      { fullSync, batchSize: 100 }
    );

    console.log(`[${this.config.name}] Completed:`, results);
    return results;
  }
}

export const yourAgent = new YourAgent();
```

## Implementation Checklist

For each agent:

- [ ] Create file `lib/sync/agents/XX-your-name.ts`
- [ ] Define TypeScript interfaces for CV CRM and DB data
- [ ] Extend `BaseSyncAgent<CVCRMType, DBType>`
- [ ] Configure `AgentConfig` in constructor
- [ ] Implement `transformData()` method
- [ ] Implement `getUpsertQuery()` method
- [ ] Implement `sync()` convenience method
- [ ] Export singleton instance
- [ ] Test with small batch first
- [ ] Test full sync
- [ ] Verify data integrity

## Available Base Methods

Your agent automatically inherits these methods from `BaseSyncAgent`:

### `syncTable(tableName, endpoint, tokenVar, options)`
Syncs a single table with automatic:
- Pagination
- Rate limiting
- Error handling
- Cursor management
- Logging

### `syncAll(options)`
Syncs all tables defined in `config.tables`

### `getSyncStatus()`
Returns last 10 sync operations for this agent

### `resetSync(tableName)`
Resets cursor for testing/debugging

## Common Patterns

### Pattern 1: Single Endpoint, Single Table

Most common pattern. See `01-leads-core.ts`.

```typescript
async sync(fullSync = false) {
  return this.syncTable(
    'cvcrm_leads',
    '/api/v1/comercial/leads',
    'CVCRM_TOKEN_LEAD',
    { fullSync }
  );
}
```

### Pattern 2: Single Endpoint, Multiple Tables

When one endpoint returns nested data for multiple tables.

```typescript
async sync(fullSync = false) {
  // Fetch all data
  const results = await this.syncTable(
    'main_table',
    '/api/v1/endpoint',
    'TOKEN_VAR',
    { fullSync }
  );

  // Process nested data separately
  // Extract and insert into related tables

  return results;
}
```

### Pattern 3: Multiple Endpoints

When you need to sync from different endpoints.

```typescript
async sync(fullSync = false) {
  const results = {};

  results.table1 = await this.syncTable(
    'table1',
    '/api/v1/endpoint1',
    'TOKEN1',
    { fullSync }
  );

  results.table2 = await this.syncTable(
    'table2',
    '/api/v1/endpoint2',
    'TOKEN2',
    { fullSync }
  );

  return results;
}
```

### Pattern 4: Dependent Data

When you need parent IDs before syncing children.

```typescript
async sync(fullSync = false) {
  // First sync parent
  await parentAgent.sync(fullSync);

  // Then sync children
  return this.syncTable(
    'child_table',
    '/api/v1/endpoint',
    'TOKEN',
    { fullSync }
  );
}
```

## Data Transformation Tips

### Handle Dates
```typescript
transformData(data) {
  return {
    data_cadastro: data.data_cad ? new Date(data.data_cad) : undefined,
  };
}
```

### Handle Nested Objects
```typescript
transformData(data) {
  return {
    corretor_id: data.corretor?.id,
    corretor_nome: data.corretor?.nome,
  };
}
```

### Handle Arrays
```typescript
transformData(data) {
  return {
    empreendimentos: JSON.stringify(data.empreendimentos || []),
  };
}
```

### Store Raw Data
```typescript
transformData(data) {
  return {
    // ... mapped fields
    cvcrm_data: JSON.stringify(data), // Always store original
  };
}
```

## Testing Your Agent

```typescript
// Test file: lib/sync/agents/__tests__/XX-your-agent.test.ts
import { yourAgent } from '../XX-your-agent';

describe('YourAgent', () => {
  it('should sync data', async () => {
    const result = await yourAgent.sync();

    expect(result.errors).toBe(0);
    expect(result.total).toBeGreaterThan(0);
  });

  it('should transform data correctly', () => {
    const cvcrm = { id: 123, nome: 'Test' };
    const db = yourAgent.transformData(cvcrm);

    expect(db.cvcrm_id).toBe(123);
    expect(db.nome).toBe('Test');
  });
});
```

## Debugging

### Enable Verbose Logging
```typescript
async sync(fullSync = false) {
  console.log('[Agent] Config:', this.config);
  console.log('[Agent] Starting sync...');

  const results = await this.syncTable(...);

  console.log('[Agent] Results:', {
    total: results.total,
    created: results.created,
    updated: results.updated,
    errors: results.errors,
    duration: results.duration,
  });

  if (results.errors > 0) {
    console.error('[Agent] Errors:', results.results.filter(r => r.operation === 'error'));
  }

  return results;
}
```

### Test with Small Batches
```typescript
const result = await yourAgent.sync({
  fullSync: true,
  limit: 10, // Only sync 10 items for testing
  batchSize: 5, // 5 items per batch
});
```

### Reset Cursor During Development
```typescript
await yourAgent.resetSync('table_name');
await yourAgent.sync(); // Will start from scratch
```

## Performance Optimization

### Adjust Batch Size
Larger batches = faster but more memory:
```typescript
{ batchSize: 500 } // For simple data
{ batchSize: 50 }  // For complex nested data
```

### Parallel Syncing
Different agents can run in parallel:
```typescript
await Promise.all([
  agent01.sync(),
  agent02.sync(),
  agent03.sync(),
]);
```

### Incremental Sync
Only sync changes since last run:
```typescript
await agent.sync(false); // Use cursor, only fetch new data
```

## Common Issues

### Issue: "Missing environment variable"
**Solution**: Add token to `.env`:
```bash
CVCRM_TOKEN_XXX=your-token-here
```

### Issue: "ON CONFLICT column does not exist"
**Solution**: Ensure migration created `cvcrm_id` unique constraint:
```sql
cvcrm_id INTEGER UNIQUE NOT NULL
```

### Issue: "Rate limit exceeded"
**Solution**: Adjust rate limiter config or add delay between agents.

### Issue: "Transformation error"
**Solution**: Add null checks and default values:
```typescript
email: data.email || null,
score: data.score ?? 0,
tags: data.tags || [],
```

## Agent Status by Domain

### Domain 1: Leads ✅ Pattern Established
- `01-leads-core` ✅ **REFERENCE IMPLEMENTATION**
- `02-leads-conversoes` ⏳ To implement
- `03-leads-interacoes` ⏳ To implement
- `04-leads-tarefas` ⏳ To implement
- `05-leads-historico` ⏳ To implement

### Domain 2: Pessoas ⏳
- `06-pessoas-core` ⏳
- `07-pessoas-detalhes` ⏳
- `08-pessoas-financeiro` ⏳
- `09-pessoas-bens` ⏳

### Domain 3: Reservas ⏳
- `10-reservas-core` ⏳
- `11-reservas-comercial` ⏳
- `12-reservas-detalhes` ⏳
- `13-reservas-historico` ⏳
- `14-reservas-integracoes` ⏳

### Domain 4: Atendimentos ⏳
- `15-atendimentos-core` ⏳
- `16-atendimentos-tarefas` ⏳
- `17-atendimentos-times` ⏳

### Domain 5: Assistências ⏳
- `18-assistencias` ⏳
- `19-assistencias-workflow` ⏳

### Domain 6: Comerciais ⏳
- `20-comissoes` ⏳
- `21-corretores` ⏳
- `22-precadastros` ⏳
- `23-repasses` ⏳
- `24-pesquisas` ⏳
- `25-unidades` ⏳

### Domain 7: Finais ⏳
- `26-processos` ⏳
- `27-vendas` ⏳
- `28-administrativo` ⏳

## Resources

- **Base Class**: `lib/sync/base-agent.ts`
- **API Client**: `lib/sync/cvcrm-api.ts`
- **Types**: `lib/sync/types.ts`
- **Migration**: `migrations/002_cvcrm_sync_complete.sql`
- **Status Doc**: `CVCRM_INTEGRATION_STATUS.md`

## Getting Help

1. Check the reference implementation: `01-leads-core.ts`
2. Review your agent definition: `.claude/agents/XX-your-name.md`
3. Check the migration SQL for your table structure
4. Look at similar agents in the same domain
5. Check sync logs in database: `SELECT * FROM sync_logs ORDER BY started_at DESC`

---

**Last Updated**: 2026-01-17
**Orchestrator**: cvcrm-orchestrator
